const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AdminClientsError,
  getAdminClientDetail,
  listAdminClients
} = require("../server/services/adminClients.service");

function createScriptedConnection(steps) {
  const scriptedSteps = [...steps];
  let callIndex = 0;

  return {
    async query(sql, params = []) {
      const normalizedSql = sql.replace(/\s+/g, " ").trim();
      const step = scriptedSteps[callIndex];

      if (!step) {
        throw new Error(`Query no esperada #${callIndex + 1}: ${normalizedSql}`);
      }

      if (step.includes) {
        assert.equal(normalizedSql.includes(step.includes), true, `Falta "${step.includes}"`);
      }

      if (step.assert) {
        step.assert({ sql: normalizedSql, params });
      }

      callIndex += 1;
      return [step.rows || []];
    },
    assertDone() {
      assert.equal(callIndex, scriptedSteps.length, "No se consumieron todos los pasos");
    }
  };
}

test("listAdminClients devuelve stats y proximas/ultimas citas por cliente", async () => {
  const connection = createScriptedConnection([
    {
      includes: "FROM centers",
      rows: [{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]
    },
    {
      includes: "FROM clients c",
      rows: [
        {
          id: 10,
          fullName: "Ana Luna",
          firstName: "Ana",
          lastName: "Luna",
          whatsapp: "59170000001",
          age: 31,
          city: "La Paz",
          source: "Instagram",
          onboardingCompletedAt: "2026-05-07T12:00:00.000Z",
          createdAt: "2026-05-01T12:00:00.000Z",
          onboardingComplete: 1
        },
        {
          id: 11,
          fullName: "Bruno Sol",
          firstName: "Bruno",
          lastName: "Sol",
          whatsapp: "59170000002",
          age: 25,
          city: "Cochabamba",
          source: "Referido",
          onboardingCompletedAt: null,
          createdAt: "2026-05-02T12:00:00.000Z",
          onboardingComplete: 0
        }
      ]
    },
    {
      includes: "COUNT(*) AS totalAppointments",
      rows: [
        {
          clientId: 10,
          totalAppointments: 4,
          pendingCount: 1,
          confirmedCount: 1,
          completedCount: 1,
          cancelledCount: 1,
          noShowCount: 0
        }
      ]
    },
    {
      includes: "AND a.status IN ('pending', 'confirmed')",
      rows: [
        {
          clientId: 10,
          id: 201,
          publicCode: "PUB-NEXT-201",
          status: "confirmed",
          startsAt: "2026-05-15T14:00:00.000Z",
          endsAt: "2026-05-15T15:00:00.000Z",
          serviceName: "Aromaterapia",
          therapistName: "Bea",
          roomName: "Sala Sol"
        }
      ]
    },
    {
      includes: "AND a.starts_at <= ?",
      rows: [
        {
          clientId: 10,
          id: 200,
          publicCode: "PUB-LAST-200",
          status: "completed",
          startsAt: "2026-05-05T14:00:00.000Z",
          endsAt: "2026-05-05T15:00:00.000Z",
          serviceName: "Masaje",
          therapistName: "Ana",
          roomName: "Sala Luna"
        }
      ]
    }
  ]);

  const payload = await listAdminClients({
    connection,
    adminSession: { centerId: 1 },
    onboarding: "all",
    limit: 20,
    now: new Date("2026-05-09T12:00:00.000Z")
  });

  connection.assertDone();
  assert.equal(payload.center.id, 1);
  assert.equal(payload.clients.length, 2);
  assert.equal(payload.clients[0].id, 10);
  assert.equal(payload.clients[0].onboardingComplete, true);
  assert.equal(payload.clients[0].stats.totalAppointments, 4);
  assert.equal(payload.clients[0].nextAppointment.publicCode, "PUB-NEXT-201");
  assert.equal(payload.clients[0].lastAppointment.publicCode, "PUB-LAST-200");
  assert.equal(payload.clients[1].stats.totalAppointments, 0);
  assert.equal(payload.clients[1].nextAppointment, null);
});

test("listAdminClients aplica filtro onboarding=complete y busqueda q", async () => {
  const connection = createScriptedConnection([
    {
      includes: "FROM centers",
      rows: [{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]
    },
    {
      includes: "FROM clients c",
      assert: ({ sql, params }) => {
        assert.equal(sql.includes("LOWER(c.full_name) LIKE ?"), true);
        assert.equal(sql.includes(") = 1"), true);
        assert.equal(params[1], "%ana%");
      },
      rows: [
        {
          id: 10,
          fullName: "Ana Luna",
          firstName: "Ana",
          lastName: "Luna",
          whatsapp: "59170000001",
          age: 31,
          city: "La Paz",
          source: "Instagram",
          onboardingCompletedAt: "2026-05-07T12:00:00.000Z",
          createdAt: "2026-05-01T12:00:00.000Z",
          onboardingComplete: 1
        }
      ]
    },
    {
      includes: "COUNT(*) AS totalAppointments",
      rows: []
    },
    {
      includes: "AND a.status IN ('pending', 'confirmed')",
      rows: []
    },
    {
      includes: "AND a.starts_at <= ?",
      rows: []
    }
  ]);

  const payload = await listAdminClients({
    connection,
    adminSession: { centerId: 1 },
    q: "Ana",
    onboarding: "complete",
    limit: 20
  });

  connection.assertDone();
  assert.equal(payload.filters.q, "Ana");
  assert.equal(payload.filters.onboarding, "complete");
  assert.equal(payload.clients.length, 1);
});

test("listAdminClients aplica busqueda por whatsapp", async () => {
  const connection = createScriptedConnection([
    {
      includes: "FROM centers",
      rows: [{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]
    },
    {
      includes: "FROM clients c",
      assert: ({ sql, params }) => {
        assert.equal(sql.includes("LOWER(c.whatsapp_e164) LIKE ?"), true);
        assert.equal(params[1], "%59170000001%");
      },
      rows: [
        {
          id: 10,
          fullName: "Ana Luna",
          firstName: "Ana",
          lastName: "Luna",
          whatsapp: "59170000001",
          age: 31,
          city: "La Paz",
          source: "Instagram",
          onboardingCompletedAt: "2026-05-07T12:00:00.000Z",
          createdAt: "2026-05-01T12:00:00.000Z",
          onboardingComplete: 1
        }
      ]
    },
    {
      includes: "COUNT(*) AS totalAppointments",
      rows: []
    },
    {
      includes: "AND a.status IN ('pending', 'confirmed')",
      rows: []
    },
    {
      includes: "AND a.starts_at <= ?",
      rows: []
    }
  ]);

  const payload = await listAdminClients({
    connection,
    adminSession: { centerId: 1 },
    q: "59170000001",
    onboarding: "all",
    limit: 20
  });

  connection.assertDone();
  assert.equal(payload.filters.q, "59170000001");
  assert.equal(payload.clients.length, 1);
  assert.equal(payload.clients[0].whatsapp, "59170000001");
});

test("listAdminClients respeta scope por centro del admin", async () => {
  const connection = createScriptedConnection([
    {
      includes: "FROM centers",
      rows: []
    }
  ]);

  await assert.rejects(
    listAdminClients({
      connection,
      adminSession: { centerId: 99 }
    }),
    (error) => {
      assert.equal(error instanceof AdminClientsError, true);
      assert.equal(error.code, "ADMIN_CENTER_SCOPE_FORBIDDEN");
      return true;
    }
  );
});

test("getAdminClientDetail devuelve ficha, historial y pagos", async () => {
  const connection = createScriptedConnection([
    {
      includes: "FROM centers",
      rows: [{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]
    },
    {
      includes: "FROM clients c",
      rows: [
        {
          id: 10,
          fullName: "Ana Luna",
          firstName: "Ana",
          lastName: "Luna",
          whatsapp: "59170000001",
          age: 31,
          city: "La Paz",
          source: "Instagram",
          onboardingCompletedAt: "2026-05-07T12:00:00.000Z",
          createdAt: "2026-05-01T12:00:00.000Z",
          onboardingComplete: 1
        }
      ]
    },
    {
      includes: "COUNT(*) AS totalAppointments",
      rows: [
        {
          clientId: 10,
          totalAppointments: 5,
          pendingCount: 1,
          confirmedCount: 1,
          completedCount: 2,
          cancelledCount: 1,
          noShowCount: 0
        }
      ]
    },
    {
      includes: "AND a.status IN ('pending', 'confirmed')",
      rows: [
        {
          clientId: 10,
          id: 210,
          publicCode: "PUB-NEXT-210",
          status: "confirmed",
          startsAt: "2026-05-12T12:00:00.000Z",
          endsAt: "2026-05-12T13:00:00.000Z",
          serviceName: "Aromaterapia",
          therapistName: "Bea",
          roomName: "Sala Sol"
        }
      ]
    },
    {
      includes: "AND a.starts_at <= ?",
      rows: [
        {
          clientId: 10,
          id: 209,
          publicCode: "PUB-LAST-209",
          status: "completed",
          startsAt: "2026-05-03T12:00:00.000Z",
          endsAt: "2026-05-03T13:00:00.000Z",
          serviceName: "Masaje",
          therapistName: "Ana",
          roomName: "Sala Luna"
        }
      ]
    },
    {
      includes: "ORDER BY a.starts_at DESC, a.id DESC",
      rows: [
        {
          id: 209,
          publicCode: "PUB-LAST-209",
          status: "completed",
          startsAt: "2026-05-03T12:00:00.000Z",
          endsAt: "2026-05-03T13:00:00.000Z",
          serviceName: "Masaje",
          therapistName: "Ana",
          roomName: "Sala Luna"
        }
      ]
    },
    {
      includes: "FROM payments p",
      assert: ({ sql, params }) => {
        assert.equal(sql.includes("p.center_id = ?"), true);
        assert.equal(sql.includes("a.center_id = ?"), true);
        assert.deepEqual(params, [1, 1, 10, 50]);
      },
      rows: [
        {
          id: 50,
          status: "approved",
          amount: 120,
          currencyCode: "BOB",
          method: "transfer",
          reviewedAt: "2026-05-03T18:00:00.000Z",
          notes: "ok",
          createdAt: "2026-05-03T17:00:00.000Z",
          updatedAt: "2026-05-03T17:30:00.000Z",
          appointmentId: 209,
          publicCode: "PUB-LAST-209",
          appointmentStatus: "completed",
          startsAt: "2026-05-03T12:00:00.000Z"
        }
      ]
    }
  ]);

  const payload = await getAdminClientDetail({
    connection,
    adminSession: { centerId: 1 },
    clientId: 10,
    now: new Date("2026-05-09T12:00:00.000Z")
  });

  connection.assertDone();
  assert.equal(payload.client.id, 10);
  assert.equal(payload.client.stats.totalAppointments, 5);
  assert.equal(payload.client.nextAppointment.publicCode, "PUB-NEXT-210");
  assert.equal(payload.client.lastAppointment.publicCode, "PUB-LAST-209");
  assert.equal(payload.appointmentsHistory.length, 1);
  assert.equal(payload.payments.length, 1);
  assert.equal(payload.payments[0].appointment.publicCode, "PUB-LAST-209");
});

test("getAdminClientDetail devuelve 404 para cliente inexistente", async () => {
  const connection = createScriptedConnection([
    {
      includes: "FROM centers",
      rows: [{ id: 1, slug: "luna", name: "Luna Mandala", timezone: "America/La_Paz" }]
    },
    {
      includes: "FROM clients c",
      rows: []
    }
  ]);

  await assert.rejects(
    getAdminClientDetail({
      connection,
      adminSession: { centerId: 1 },
      clientId: 999
    }),
    (error) => {
      assert.equal(error instanceof AdminClientsError, true);
      assert.equal(error.code, "CLIENT_NOT_FOUND");
      assert.equal(error.status, 404);
      return true;
    }
  );
});
