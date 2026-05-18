import { useEffect, useState } from "react";

import { Button } from "../../ui/Button";
import { Chip } from "../../ui/Chip";
import { Input } from "../../ui/Input";
import { Select } from "../../ui/Select";
import {
  activePaymentForAppointment,
  latestPaymentForAppointment,
  operablePaymentForAppointment,
  paymentActionState,
  paymentAmountLabel,
  paymentStatusLabel,
  paymentStatusTone
} from "./detailUtils";
import {
  useApprovePaymentMutation,
  useCancelPaymentMutation,
  useCreateAppointmentPaymentMutation,
  useRejectPaymentMutation,
  useSubmitPaymentMutation
} from "./mutations";

const METHOD_OPTIONS = [
  ["transfer", "Transferencia"],
  ["cash", "Efectivo"],
  ["card", "Tarjeta"],
  ["other", "Otro"]
];

function PaymentSnapshot({ payment }) {
  if (!payment) {
    return <p className="drawer-muted">Sin pago registrado.</p>;
  }

  return (
    <div className="payment-snapshot">
      <div>
        <strong>{paymentAmountLabel(payment)}</strong>
        <span>{payment.reference || payment.notes || "Sin referencia"}</span>
      </div>
      <Chip tone={paymentStatusTone(payment.status)}>
        {paymentStatusLabel(payment.status)}
      </Chip>
    </div>
  );
}

function PaymentFieldGrid({ reference, notes, onReferenceChange, onNotesChange }) {
  return (
    <div className="payment-fields">
      <Input
        label="Referencia"
        name="paymentReference"
        value={reference}
        onChange={(event) => onReferenceChange(event.target.value)}
      />
      <Input
        label="Notas"
        name="paymentNotes"
        value={notes}
        onChange={(event) => onNotesChange(event.target.value)}
      />
    </div>
  );
}

export function PaymentSection({ appointment, date }) {
  const activePayment = activePaymentForAppointment(appointment);
  const operablePayment = operablePaymentForAppointment(appointment);
  const latestPayment = operablePayment || latestPaymentForAppointment(appointment);
  const actionState = paymentActionState(operablePayment);
  const createMutation = useCreateAppointmentPaymentMutation(date);
  const submitMutation = useSubmitPaymentMutation(date);
  const approveMutation = useApprovePaymentMutation(date);
  const rejectMutation = useRejectPaymentMutation(date);
  const cancelMutation = useCancelPaymentMutation(date);
  const [method, setMethod] = useState("transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const pending = [
    createMutation,
    submitMutation,
    approveMutation,
    rejectMutation,
    cancelMutation
  ].some((mutation) => mutation.isPending);
  const mutationError = [
    createMutation,
    submitMutation,
    approveMutation,
    rejectMutation,
    cancelMutation
  ].find((mutation) => mutation.error)?.error;

  useEffect(() => {
    setReference("");
    setNotes("");
    setReviewNote("");
    setRejectReason("");
  }, [appointment?.id, operablePayment?.id]);

  async function handleCreate(event) {
    event.preventDefault();
    await createMutation.mutateAsync({
      appointmentId: appointment.id,
      method,
      reference,
      notes
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await submitMutation.mutateAsync({
      appointmentId: appointment.id,
      paymentId: operablePayment.id,
      reference,
      notes
    });
  }

  async function handleApprove() {
    await approveMutation.mutateAsync({
      appointmentId: appointment.id,
      paymentId: operablePayment.id,
      notes: reviewNote
    });
  }

  async function handleReject(event) {
    event.preventDefault();
    await rejectMutation.mutateAsync({
      appointmentId: appointment.id,
      paymentId: operablePayment.id,
      reason: rejectReason,
      notes: reviewNote
    });
  }

  async function handleCancel() {
    await cancelMutation.mutateAsync({
      appointmentId: appointment.id,
      paymentId: operablePayment.id,
      reason: reviewNote || "Pago anulado desde Admin"
    });
  }

  return (
    <section className="drawer-section payment-section" aria-label="Pagos">
      <div className="payment-header">
        <h4>Pagos</h4>
        <span>{latestPayment ? "Manual C0" : "Sin pago activo"}</span>
      </div>

      <PaymentSnapshot payment={latestPayment} />

      {actionState === "create" ? (
        <form className="payment-form" onSubmit={handleCreate}>
          <Select
            label="Metodo"
            name="paymentMethod"
            value={method}
            onChange={(event) => setMethod(event.target.value)}
          >
            {METHOD_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <PaymentFieldGrid
            reference={reference}
            notes={notes}
            onReferenceChange={setReference}
            onNotesChange={setNotes}
          />
          <Button type="submit" variant="secondary" disabled={pending}>
            Registrar pago
          </Button>
        </form>
      ) : null}

      {actionState === "submit" ? (
        <form className="payment-form" onSubmit={handleSubmit}>
          <PaymentFieldGrid
            reference={reference}
            notes={notes}
            onReferenceChange={setReference}
            onNotesChange={setNotes}
          />
          <div className="payment-actions">
            <Button type="submit" variant="secondary" disabled={pending}>
              Marcar recibido
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={handleCancel}>
              Anular pago
            </Button>
          </div>
        </form>
      ) : null}

      {activePayment?.status === "pending" && activePayment.method === "cash" ? (
        <div className="payment-form">
          <Input
            label="Nota de caja"
            name="cashApprovalNote"
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={pending || !reviewNote.trim()}
            onClick={handleApprove}
          >
            Aprobar efectivo
          </Button>
        </div>
      ) : null}

      {actionState === "review" ? (
        <form className="payment-form" onSubmit={handleReject}>
          <Input
            label="Nota de revision"
            name="paymentReviewNote"
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
          />
          <Input
            label="Motivo de rechazo"
            name="paymentRejectReason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
          />
          <div className="payment-actions">
            <Button type="button" variant="secondary" disabled={pending} onClick={handleApprove}>
              Aprobar
            </Button>
            <Button type="submit" variant="secondary" disabled={pending || !rejectReason.trim()}>
              Rechazar
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={handleCancel}>
              Anular
            </Button>
          </div>
        </form>
      ) : null}

      {mutationError ? (
        <p className="form-error drawer-error">{mutationError.message}</p>
      ) : null}
    </section>
  );
}
