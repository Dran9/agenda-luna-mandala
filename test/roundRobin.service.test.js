const assert = require("node:assert/strict");
const test = require("node:test");

const {
  pickTherapistCandidate,
  chooseTherapistForService
} = require("../server/services/roundRobin.service");

class FakeRoundRobinConnection {
  constructor({ lastTherapistId = null, loadByTherapist = {} } = {}) {
    this.lastTherapistId = lastTherapistId;
    this.loadByTherapist = new Map(
      Object.entries(loadByTherapist).map(([therapistId, claimCount]) => [Number(therapistId), Number(claimCount)])
    );
    this.persistedState = [];
  }

  async query(sql, params) {
    if (sql.includes("FROM round_robin_state") && sql.includes("LIMIT 1")) {
      if (this.lastTherapistId === null) {
        return [[]];
      }

      return [[{ lastTherapistId: this.lastTherapistId }]];
    }

    if (sql.includes("FROM appointment_resource_claims") && sql.includes("GROUP BY resource_id")) {
      const therapistIds = params.slice(3).map((value) => Number(value));
      const rows = therapistIds
        .filter((therapistId) => this.loadByTherapist.has(therapistId))
        .map((therapistId) => ({
          therapistId,
          claimCount: this.loadByTherapist.get(therapistId)
        }));

      return [rows];
    }

    if (sql.includes("INSERT INTO round_robin_state")) {
      const therapistId = Number(params[2]);
      this.lastTherapistId = therapistId;
      this.persistedState.push({
        centerId: Number(params[0]),
        serviceId: Number(params[1]),
        therapistId
      });
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Unsupported SQL in fake round-robin connection: ${sql}`);
  }
}

const CANDIDATES = [
  { therapistId: 11, therapistName: "Ana" },
  { therapistId: 12, therapistName: "Bea" },
  { therapistId: 13, therapistName: "Carla" }
];

test("roundRobin: booking publico rota al siguiente terapeuta disponible (RR estricto)", () => {
  const selected = pickTherapistCandidate({
    candidates: CANDIDATES,
    loadMap: new Map([
      [11, 0],
      [12, 99],
      [13, 99]
    ]),
    lastTherapistId: 11
  });

  assert.equal(selected.therapistId, 12);
});

test("roundRobin: en empate rota segun lastTherapistId", () => {
  const loadMap = new Map([
    [11, 2],
    [12, 2],
    [13, 2]
  ]);

  const selected = pickTherapistCandidate({
    candidates: CANDIDATES,
    loadMap,
    lastTherapistId: 12
  });

  assert.equal(selected.therapistId, 13);
});

test("roundRobin: wrap al inicio cuando lastTherapistId es el mayor", () => {
  const loadMap = new Map([
    [11, 0],
    [12, 0],
    [13, 0]
  ]);

  const selected = pickTherapistCandidate({
    candidates: CANDIDATES,
    loadMap,
    lastTherapistId: 13
  });

  assert.equal(selected.therapistId, 11);
});

test("roundRobin: con Carla como ultima, el siguiente disponible es Daniel", () => {
  const selected = pickTherapistCandidate({
    candidates: [
      { therapistId: 201, therapistName: "Carla Bustamante" },
      { therapistId: 202, therapistName: "Daniel MacLean" }
    ],
    lastTherapistId: 201
  });

  assert.equal(selected.therapistId, 202);
});

test("roundRobin: chooseTherapistForService persiste el estado", async () => {
  const connection = new FakeRoundRobinConnection({
    lastTherapistId: 11,
    loadByTherapist: {
      11: 2,
      12: 2,
      13: 2
    }
  });

  const selected = await chooseTherapistForService({
    connection,
    centerId: 1,
    serviceId: 7,
    candidates: CANDIDATES,
    windowStart: "2026-05-11T00:00:00.000Z",
    windowEnd: "2026-05-12T00:00:00.000Z"
  });

  assert.equal(selected.therapistId, 12);
  assert.equal(connection.persistedState.length, 1);
  assert.equal(connection.persistedState[0].therapistId, 12);
});
