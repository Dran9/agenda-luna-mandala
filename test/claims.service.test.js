const assert = require("node:assert/strict");
const test = require("node:test");

const {
  createAppointmentClaims,
  releaseAppointmentClaims
} = require("../server/services/claims.service");
const { InvalidAppointmentStateError, SlotOccupiedError } = require("../server/services/errors");

class FakeClaimsConnection {
  constructor() {
    this.claimRows = [];
    this._snapshot = null;
  }

  async beginTransaction() {
    this._snapshot = this.claimRows.map((row) => ({ ...row }));
  }

  async commit() {
    this._snapshot = null;
  }

  async rollback() {
    if (this._snapshot) {
      this.claimRows = this._snapshot.map((row) => ({ ...row }));
      this._snapshot = null;
    }
  }

  async query(sql, params) {
    if (sql.includes("DELETE FROM appointment_resource_claims WHERE appointment_id = ?")) {
      const [appointmentId] = params;
      const before = this.claimRows.length;
      this.claimRows = this.claimRows.filter((row) => row.appointmentId !== appointmentId);
      return [{ affectedRows: before - this.claimRows.length }];
    }

    if (sql.includes("INSERT INTO appointment_resource_claims")) {
      const rows = [];

      for (let index = 0; index < params.length; index += 5) {
        rows.push({
          centerId: Number(params[index]),
          appointmentId: Number(params[index + 1]),
          resourceType: params[index + 2],
          resourceId: Number(params[index + 3]),
          claimTime: String(params[index + 4])
        });
      }

      for (const row of rows) {
        const duplicate = this.claimRows.some(
          (existing) =>
            existing.centerId === row.centerId &&
            existing.resourceType === row.resourceType &&
            existing.resourceId === row.resourceId &&
            existing.claimTime === row.claimTime
        );

        if (duplicate) {
          const error = new Error("Duplicate claim");
          error.code = "ER_DUP_ENTRY";
          error.errno = 1062;
          throw error;
        }
      }

      this.claimRows.push(...rows);
      return [{ affectedRows: rows.length }];
    }

    throw new Error(`Unsupported SQL in fake connection: ${sql}`);
  }
}

function createAppointment(overrides = {}) {
  return {
    centerId: 1,
    appointmentId: 100,
    therapistId: 11,
    roomId: 21,
    startsAt: "2026-05-08T10:00:00.000Z",
    endsAt: "2026-05-08T10:03:00.000Z",
    status: "confirmed",
    ...overrides
  };
}

test("claims: no doble terapeuta en el mismo minuto", async () => {
  const connection = new FakeClaimsConnection();

  await createAppointmentClaims({
    connection,
    appointment: createAppointment({ appointmentId: 101, therapistId: 11, roomId: 21 })
  });

  await assert.rejects(
    createAppointmentClaims({
      connection,
      appointment: createAppointment({ appointmentId: 102, therapistId: 11, roomId: 22 })
    }),
    (error) => error instanceof SlotOccupiedError
  );
});

test("claims: no doble sala en el mismo minuto", async () => {
  const connection = new FakeClaimsConnection();

  await createAppointmentClaims({
    connection,
    appointment: createAppointment({ appointmentId: 201, therapistId: 11, roomId: 21 })
  });

  await assert.rejects(
    createAppointmentClaims({
      connection,
      appointment: createAppointment({ appointmentId: 202, therapistId: 12, roomId: 21 })
    }),
    (error) => error instanceof SlotOccupiedError
  );
});

test("claims: dos citas simultaneas validas con recursos distintos", async () => {
  const connection = new FakeClaimsConnection();

  const first = await createAppointmentClaims({
    connection,
    appointment: createAppointment({ appointmentId: 301, therapistId: 11, roomId: 21 })
  });

  const second = await createAppointmentClaims({
    connection,
    appointment: createAppointment({ appointmentId: 302, therapistId: 12, roomId: 22 })
  });

  assert.equal(first.claimsCreated, 6);
  assert.equal(second.claimsCreated, 6);
  assert.equal(connection.claimRows.length, 12);
});

test("claims: liberar claims permite volver a reservar", async () => {
  const connection = new FakeClaimsConnection();

  await createAppointmentClaims({
    connection,
    appointment: createAppointment({ appointmentId: 401, therapistId: 11, roomId: 21 })
  });

  const releaseResult = await releaseAppointmentClaims({
    connection,
    appointmentId: 401
  });

  assert.equal(releaseResult.claimsReleased, 6);
  assert.equal(connection.claimRows.length, 0);

  await createAppointmentClaims({
    connection,
    appointment: createAppointment({ appointmentId: 402, therapistId: 11, roomId: 21 })
  });

  assert.equal(connection.claimRows.length, 6);
});

test("claims: no crea claims en estados terminales", async () => {
  const connection = new FakeClaimsConnection();

  await assert.rejects(
    createAppointmentClaims({
      connection,
      appointment: createAppointment({ status: "cancelled" })
    }),
    (error) => error instanceof InvalidAppointmentStateError
  );

  assert.equal(connection.claimRows.length, 0);
});

test("claims: guarda claim_time en datetime local de DB para input -04:00", async () => {
  const connection = new FakeClaimsConnection();

  await createAppointmentClaims({
    connection,
    appointment: createAppointment({
      appointmentId: 501,
      therapistId: 77,
      roomId: 88,
      startsAt: "2026-05-11T09:00:00-04:00",
      endsAt: "2026-05-11T09:01:00-04:00"
    })
  });

  const therapistClaim = connection.claimRows.find(
    (row) => row.appointmentId === 501 && row.resourceType === "therapist"
  );

  assert.equal(therapistClaim.claimTime, "2026-05-11 09:00:00");
  assert.notEqual(therapistClaim.claimTime, "2026-05-11 13:00:00");
});
