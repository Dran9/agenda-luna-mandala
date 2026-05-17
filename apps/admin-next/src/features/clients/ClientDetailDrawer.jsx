import { Chip } from "../../ui/Chip";
import { Drawer } from "../../ui/Drawer";
import {
  appointmentSummaryLabel,
  clientContact,
  clientDetailFromPayload,
  clientDisplayName,
  clientOnboardingLabel,
  clientOnboardingTone,
  clientProfileRows,
  clientStatsRows,
  formatClientDateTime,
  paymentSummaryLabel
} from "./clientUtils";
import { useClientDetailQuery } from "./queries";

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function HistoryRows({ appointments }) {
  if (!appointments.length) {
    return <p className="drawer-muted">Sin historial.</p>;
  }

  return appointments.slice(0, 5).map((appointment) => (
    <DetailRow
      key={appointment.id}
      label={formatClientDateTime(appointment.startsAt)}
      value={`${appointment.serviceName || "-"} · ${appointment.status || "-"}`}
    />
  ));
}

function PaymentRows({ payments }) {
  if (!payments.length) {
    return <p className="drawer-muted">Sin pagos.</p>;
  }

  return payments.slice(0, 5).map((payment) => (
    <DetailRow
      key={payment.id}
      label={formatClientDateTime(payment.createdAt)}
      value={paymentSummaryLabel(payment)}
    />
  ));
}

export function ClientDetailDrawer({ clientId, onClose, open }) {
  const detailQuery = useClientDetailQuery(clientId);
  const client = clientDetailFromPayload(detailQuery.data);
  const history = detailQuery.data?.appointmentsHistory || [];
  const payments = detailQuery.data?.payments || [];

  return (
    <Drawer open={open} title="Detalle de cliente" onClose={onClose}>
      {detailQuery.isLoading ? (
        <div className="drawer-section">
          <span className="skeleton-cell skeleton-wide" />
          <span className="skeleton-cell skeleton-medium" />
          <span className="skeleton-cell skeleton-short" />
        </div>
      ) : null}

      {detailQuery.error ? (
        <p className="form-error drawer-error">{detailQuery.error.message}</p>
      ) : null}

      {client ? (
        <>
          <section className="drawer-section drawer-summary">
            <div>
              <span>{clientContact(client)}</span>
              <h3>{clientDisplayName(client)}</h3>
              <p>{client.city || client.source || "-"}</p>
            </div>
            <Chip tone={clientOnboardingTone(client)}>
              {clientOnboardingLabel(client)}
            </Chip>
          </section>

          <dl className="drawer-section detail-list">
            <DetailRow label="Proxima" value={appointmentSummaryLabel(client.nextAppointment)} />
            <DetailRow label="Ultima" value={appointmentSummaryLabel(client.lastAppointment)} />
            <DetailRow label="Citas" value={client.stats?.totalAppointments || 0} />
            <DetailRow label="Pagos" value={payments.length} />
          </dl>

          <section className="drawer-section detail-list">
            <h3 className="drawer-section-title">Ficha</h3>
            <dl>
              {clientProfileRows(client).map(([label, value]) => (
                <DetailRow key={label} label={label} value={value} />
              ))}
            </dl>
          </section>

          <section className="drawer-section detail-list">
            <h3 className="drawer-section-title">Citas</h3>
            <dl>
              {clientStatsRows(client.stats).map(([label, value]) => (
                <DetailRow key={label} label={label} value={value} />
              ))}
            </dl>
          </section>

          <section className="drawer-section detail-list">
            <h3 className="drawer-section-title">Historial</h3>
            <HistoryRows appointments={history} />
          </section>

          <section className="drawer-section detail-list">
            <h3 className="drawer-section-title">Pagos</h3>
            <PaymentRows payments={payments} />
          </section>
        </>
      ) : null}
    </Drawer>
  );
}
