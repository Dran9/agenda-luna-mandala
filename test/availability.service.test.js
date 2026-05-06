const assert = require("node:assert/strict");
const test = require("node:test");

const { resolveAvailablePairsForSlot } = require("../server/services/availability.service");

const SLOT_START = "2026-05-11T09:00:00-04:00";
const SLOT_END = "2026-05-11T10:00:00-04:00";

function createBaseContext() {
  return {
    service: {
      id: 1,
      name: "Masaje Relajante",
      durationMinutes: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      isActive: true
    },
    therapists: [
      { therapistId: 101, therapistName: "Ana", isActive: true },
      { therapistId: 102, therapistName: "Bea", isActive: true }
    ],
    rooms: [
      { roomId: 201, roomName: "Sala Luna", isActive: true, isCompatible: true },
      { roomId: 202, roomName: "Sala Sol", isActive: true, isCompatible: true }
    ],
    schedules: [
      {
        resourceType: "therapist",
        resourceId: 101,
        weekday: 1,
        startTime: "08:00:00",
        endTime: "18:00:00",
        slotMinutes: 60,
        validFrom: null,
        validTo: null,
        isActive: 1
      },
      {
        resourceType: "therapist",
        resourceId: 102,
        weekday: 1,
        startTime: "08:00:00",
        endTime: "18:00:00",
        slotMinutes: 60,
        validFrom: null,
        validTo: null,
        isActive: 1
      },
      {
        resourceType: "room",
        resourceId: 201,
        weekday: 1,
        startTime: "08:00:00",
        endTime: "18:00:00",
        slotMinutes: 60,
        validFrom: null,
        validTo: null,
        isActive: 1
      },
      {
        resourceType: "room",
        resourceId: 202,
        weekday: 1,
        startTime: "08:00:00",
        endTime: "18:00:00",
        slotMinutes: 60,
        validFrom: null,
        validTo: null,
        isActive: 1
      }
    ],
    blocks: [],
    claims: []
  };
}

test("availability: servicio inactivo no aparece", () => {
  const context = createBaseContext();
  context.service.isActive = false;

  const pairs = resolveAvailablePairsForSlot({
    context,
    slotStartInput: SLOT_START,
    slotEndInput: SLOT_END
  });

  assert.equal(pairs.length, 0);
});

test("availability: slot local 09:00 -04:00 esta cubierto por lunes 08:00-18:00", () => {
  const context = createBaseContext();

  const pairs = resolveAvailablePairsForSlot({
    context,
    slotStartInput: "2026-05-11T09:00:00-04:00",
    slotEndInput: "2026-05-11T10:00:00-04:00"
  });

  assert.ok(pairs.length > 0);
});

test("availability: slot local 19:00 -04:00 no esta cubierto por lunes 08:00-18:00", () => {
  const context = createBaseContext();

  const pairs = resolveAvailablePairsForSlot({
    context,
    slotStartInput: "2026-05-11T19:00:00-04:00",
    slotEndInput: "2026-05-11T20:00:00-04:00"
  });

  assert.equal(pairs.length, 0);
});

test("availability: terapeuta inactivo no aparece", () => {
  const context = createBaseContext();
  context.therapists[1].isActive = false;

  const pairs = resolveAvailablePairsForSlot({
    context,
    slotStartInput: SLOT_START,
    slotEndInput: SLOT_END
  });

  assert.ok(pairs.length > 0);
  assert.equal(pairs.some((pair) => pair.therapistId === 102), false);
  assert.equal(pairs.every((pair) => pair.therapistId === 101), true);
});

test("availability: sala incompatible no aparece", () => {
  const context = createBaseContext();
  context.rooms[1].isCompatible = false;

  const pairs = resolveAvailablePairsForSlot({
    context,
    slotStartInput: SLOT_START,
    slotEndInput: SLOT_END
  });

  assert.ok(pairs.length > 0);
  assert.equal(pairs.some((pair) => pair.roomId === 202), false);
  assert.equal(pairs.every((pair) => pair.roomId === 201), true);
});

test("availability: bloqueos impiden slot", () => {
  const context = createBaseContext();
  context.blocks.push({
    resourceType: "therapist",
    resourceId: 101,
    startsAt: "2026-05-11T08:50:00-04:00",
    endsAt: "2026-05-11T09:40:00-04:00"
  });

  const pairs = resolveAvailablePairsForSlot({
    context,
    slotStartInput: SLOT_START,
    slotEndInput: SLOT_END
  });

  assert.equal(pairs.some((pair) => pair.therapistId === 101), false);
  assert.ok(pairs.length > 0);
});

test("availability: claims existentes impiden slot", () => {
  const context = createBaseContext();
  context.claims.push({
    resourceType: "room",
    resourceId: 201,
    claimTime: "2026-05-11T09:30:00-04:00"
  });

  const pairs = resolveAvailablePairsForSlot({
    context,
    slotStartInput: SLOT_START,
    slotEndInput: SLOT_END
  });

  assert.equal(pairs.some((pair) => pair.roomId === 201), false);
  assert.ok(pairs.some((pair) => pair.roomId === 202));
});
