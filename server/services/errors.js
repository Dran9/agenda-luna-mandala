class SlotOccupiedError extends Error {
  constructor(message = "Slot ocupado", details = {}) {
    super(message);
    this.name = "SlotOccupiedError";
    this.code = "SLOT_OCCUPIED";
    this.details = details;
  }
}

class PublicBookingError extends Error {
  constructor({
    message = "Error de reserva publica",
    code = "PUBLIC_BOOKING_ERROR",
    status = 500,
    details = {}
  } = {}) {
    super(message);
    this.name = "PublicBookingError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

class InvalidAppointmentStateError extends Error {
  constructor(status) {
    super(`No se pueden crear claims para estado terminal: ${status}`);
    this.name = "InvalidAppointmentStateError";
    this.code = "INVALID_APPOINTMENT_STATE";
    this.details = { status };
  }
}

class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ValidationError";
    this.code = "VALIDATION_ERROR";
    this.details = details;
  }
}

module.exports = {
  SlotOccupiedError,
  PublicBookingError,
  InvalidAppointmentStateError,
  ValidationError
};
