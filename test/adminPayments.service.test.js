const assert = require("node:assert/strict");
const test = require("node:test");

const {
  approveAdminPayment,
  cancelAdminPayment,
  createAdminAppointmentPayment,
  rejectAdminPayment,
  submitAdminPayment
} = require("../server/services/adminPayments.service");

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, " ").trim();
}

function createConnectionMock(handler) {
  const calls = [];
  return {
    calls,
    async beginTransaction() {
      calls.push({ type: "begin" });
    },
    async commit() {
      calls.push({ type: "commit" });
    },
    async rollback() {
      calls.push({ type: "rollback" });
    },
    async query(sql, params = []) {
      const normalizedSql = normalizeSql(sql);
      calls.push({ type: "query", sql: normalizedSql, params });
      return handler(normalizedSql, params);
    }
  };
}

const adminSession = {
  adminId: 7,
  centerId: 1,
  email: "admin.dev@lunamandala.local",
  role: "owner"
};

function paymentRow(overrides = {}) {
  return {
    id: 9,
    appointmentId: 44,
    status: "pending",
    amount: "250.00",
    currencyCode: "BOB",
    method: "transfer",
    reference: null,
    notes: null,
    proofFileId: null,
    submittedAt: null,
    approvedAt: null,
    rejectedAt: null,
    canceledAt: null,
    reviewedByAdminUserId: null,
    reviewedAt: null,
    createdAt: "2026-05-18T20:00:00.000Z",
    updatedAt: "2026-05-18T20:00:00.000Z",
    ...overrides
  };
}

test("createAdminAppointmentPayment creates pending payment with therapist-service snapshot", async () => {
  const connection = createConnectionMock((sql, params) => {
    assert.equal(sql.includes("appointment_resource_claims"), false);

    if (sql.includes("FROM appointments a") && sql.includes("LEFT JOIN therapist_services")) {
      assert.deepEqual(params, [1, 44]);
      return [[{
        id: 44,
        serviceId: 3,
        therapistId: 5,
        priceAmount: "250.00",
        currencyCode: "BOB"
      }]];
    }

    if (sql.includes("FROM payments") && sql.includes("status IN")) {
      assert.deepEqual(params, [1, 44, "pending", "submitted", "approved"]);
      return [[]];
    }

    if (sql.startsWith("INSERT INTO payments")) {
      assert.deepEqual(params, [1, 44, 250, "BOB", "transfer", "Banco 123", "Manual"]);
      return [{ insertId: 9 }];
    }

    if (sql.includes("FROM payments") && sql.includes("AND id = ?") && !sql.includes("FOR UPDATE")) {
      return [[paymentRow({ reference: "Banco 123", notes: "Manual" })]];
    }

    throw new Error(`Query no esperada: ${sql}`);
  });

  const result = await createAdminAppointmentPayment({
    connection,
    adminSession,
    appointmentId: 44,
    method: "transfer",
    reference: "Banco 123",
    notes: "Manual"
  });

  assert.equal(result.payment.status, "pending");
  assert.equal(result.payment.amount, 250);
  assert.equal(result.payment.currencyCode, "BOB");
  assert.equal(connection.calls.some((call) => call.type === "commit"), true);
  assert.equal(connection.calls.some((call) => call.type === "rollback"), false);
});

test("createAdminAppointmentPayment rejects missing therapist-service arancel", async () => {
  const connection = createConnectionMock((sql) => {
    if (sql.includes("FROM appointments a") && sql.includes("LEFT JOIN therapist_services")) {
      return [[{
        id: 44,
        serviceId: 3,
        therapistId: 5,
        priceAmount: "0.00",
        currencyCode: "BOB"
      }]];
    }

    throw new Error(`Query no esperada: ${sql}`);
  });

  await assert.rejects(
    () => createAdminAppointmentPayment({ connection, adminSession, appointmentId: 44 }),
    /No se pudo derivar arancel/
  );

  assert.equal(connection.calls.some((call) => call.type === "rollback"), true);
});

test("createAdminAppointmentPayment rejects duplicate active payment", async () => {
  const connection = createConnectionMock((sql) => {
    if (sql.includes("FROM appointments a") && sql.includes("LEFT JOIN therapist_services")) {
      return [[{
        id: 44,
        serviceId: 3,
        therapistId: 5,
        priceAmount: "250.00",
        currencyCode: "BOB"
      }]];
    }

    if (sql.includes("FROM payments") && sql.includes("status IN")) {
      return [[{ id: 9 }]];
    }

    throw new Error(`Query no esperada: ${sql}`);
  });

  await assert.rejects(
    () => createAdminAppointmentPayment({ connection, adminSession, appointmentId: 44 }),
    /Ya existe un pago activo/
  );

  assert.equal(connection.calls.some((call) => call.type === "rollback"), true);
});

test("submitAdminPayment marks pending payment as submitted with manual evidence", async () => {
  const now = new Date("2026-05-18T21:00:00.000Z");
  const connection = createConnectionMock((sql, params) => {
    if (sql.includes("FROM payments") && sql.includes("FOR UPDATE")) {
      return [[paymentRow()]];
    }

    if (sql.startsWith("UPDATE payments") && sql.includes("status = 'submitted'")) {
      assert.deepEqual(params, ["Banco 123", "JPG recibido", null, now, 1, 9]);
      return [{ affectedRows: 1 }];
    }

    if (sql.includes("FROM payments") && !sql.includes("FOR UPDATE")) {
      return [[paymentRow({
        status: "submitted",
        reference: "Banco 123",
        notes: "JPG recibido",
        submittedAt: now
      })]];
    }

    throw new Error(`Query no esperada: ${sql}`);
  });

  const result = await submitAdminPayment({
    connection,
    adminSession,
    paymentId: 9,
    reference: "Banco 123",
    notes: "JPG recibido",
    now
  });

  assert.equal(result.payment.status, "submitted");
  assert.equal(result.payment.submittedAt, now.toISOString());
});

test("approveAdminPayment allows cash pending approval only with note and does not touch claims", async () => {
  const now = new Date("2026-05-18T21:10:00.000Z");
  const connection = createConnectionMock((sql, params) => {
    assert.equal(sql.includes("appointment_resource_claims"), false);

    if (sql.includes("FROM payments") && sql.includes("FOR UPDATE")) {
      return [[paymentRow({ method: "cash" })]];
    }

    if (sql.startsWith("UPDATE payments") && sql.includes("status = 'approved'")) {
      assert.deepEqual(params, ["Pagado en caja", now, now, 7, 1, 9]);
      return [{ affectedRows: 1 }];
    }

    if (sql.includes("FROM payments") && !sql.includes("FOR UPDATE")) {
      return [[paymentRow({
        status: "approved",
        method: "cash",
        notes: "Pagado en caja",
        approvedAt: now,
        reviewedAt: now,
        reviewedByAdminUserId: 7
      })]];
    }

    throw new Error(`Query no esperada: ${sql}`);
  });

  const result = await approveAdminPayment({
    connection,
    adminSession,
    paymentId: 9,
    notes: "Pagado en caja",
    now
  });

  assert.equal(result.payment.status, "approved");
  assert.equal(result.payment.approvedAt, now.toISOString());
});

test("approveAdminPayment rejects pending transfer without submitted state", async () => {
  const connection = createConnectionMock((sql) => {
    if (sql.includes("FROM payments") && sql.includes("FOR UPDATE")) {
      return [[paymentRow({ method: "transfer" })]];
    }

    throw new Error(`Query no esperada: ${sql}`);
  });

  await assert.rejects(
    () => approveAdminPayment({ connection, adminSession, paymentId: 9, notes: "ok" }),
    /Transicion de pago invalida/
  );
});

test("rejectAdminPayment requires review note before querying DB", async () => {
  const connection = createConnectionMock(() => {
    throw new Error("No deberia consultar DB");
  });

  await assert.rejects(
    () => rejectAdminPayment({ connection, adminSession, paymentId: 9 }),
    /Se requiere nota o motivo/
  );

  assert.equal(connection.calls.length, 0);
});

test("cancelAdminPayment stores DB cancelled while returning API canceled", async () => {
  const now = new Date("2026-05-18T21:20:00.000Z");
  const connection = createConnectionMock((sql, params) => {
    if (sql.includes("FROM payments") && sql.includes("FOR UPDATE")) {
      return [[paymentRow({ status: "rejected" })]];
    }

    if (sql.startsWith("UPDATE payments") && sql.includes("canceled_at")) {
      assert.deepEqual(params, ["cancelled", "No aplica", now, 1, 9]);
      return [{ affectedRows: 1 }];
    }

    if (sql.includes("FROM payments") && !sql.includes("FOR UPDATE")) {
      return [[paymentRow({ status: "cancelled", notes: "No aplica", canceledAt: now })]];
    }

    throw new Error(`Query no esperada: ${sql}`);
  });

  const result = await cancelAdminPayment({
    connection,
    adminSession,
    paymentId: 9,
    reason: "No aplica",
    now
  });

  assert.equal(result.payment.status, "canceled");
  assert.equal(result.payment.canceledAt, now.toISOString());
});
