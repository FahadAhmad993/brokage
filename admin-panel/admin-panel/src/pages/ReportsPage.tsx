import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { ConfirmButton } from '../components/ConfirmButton';
import {
  fetchReports,
  setReportStatus,
  setUserBlocked,
  setUserDisabled,
  type AdminReport,
} from '../api/admin';
import { errorMessage } from '../api/client';

const REASON_LABEL: Record<string, string> = {
  spam: 'Spam',
  suspicious_activity: 'Suspicious activity',
  other: 'Other',
};

const STATUS_TONE: Record<AdminReport['status'], 'good' | 'warn' | 'bad' | 'neutral'> = {
  open: 'warn',
  reviewed: 'neutral',
  actioned: 'good',
  dismissed: 'neutral',
};

export function ReportsPage() {
  const queryClient = useQueryClient();
  const reportsQuery = useQuery({ queryKey: ['admin', 'reports'], queryFn: fetchReports });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'reviewed' | 'actioned' | 'dismissed' }) =>
      setReportStatus(id, status),
    onSuccess: invalidate,
  });

  const disableUserMutation = useMutation({
    mutationFn: ({ id, value, reason }: { id: string; value: boolean; reason?: string }) =>
      setUserDisabled(id, value, reason),
    onSuccess: () => {
      invalidate();
      invalidateUsers();
    },
  });

  const blockUserMutation = useMutation({
    mutationFn: ({ id, value, reason }: { id: string; value: boolean; reason?: string }) =>
      setUserBlocked(id, value, reason),
    onSuccess: () => {
      invalidate();
      invalidateUsers();
    },
  });

  const disableWithReason = (userId: string, reportReason: string, details?: string | null) => {
    const reason =
      window.prompt(
        'Reason shown to the user on their forced-logout screen:',
        `Disabled following a report: ${REASON_LABEL[reportReason] ?? reportReason}${details ? ` — ${details}` : ''}`,
      ) ?? undefined;
    if (reason === undefined) return; // cancelled
    disableUserMutation.mutate({ id: userId, value: true, reason });
  };

  const columns: Column<AdminReport>[] = [
    {
      key: 'reporter',
      header: 'Reported by',
      render: (r) => (
        <div className="user-cell">
          <div className="user-cell__avatar">
            {r.reporter.avatarUrl ? (
              <img src={r.reporter.avatarUrl} alt="" />
            ) : (
              r.reporter.displayName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="user-cell__name">{r.reporter.displayName}</div>
        </div>
      ),
    },
    {
      key: 'target',
      header: 'Reported',
      render: (r) =>
        r.reportedUser ? (
          <div className="user-cell">
            <div className="user-cell__avatar">
              {r.reportedUser.avatarUrl ? (
                <img src={r.reportedUser.avatarUrl} alt="" />
              ) : (
                r.reportedUser.displayName.slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <div className="user-cell__name">
                {r.reportedUser.displayName}{' '}
                {r.reportedUser.isBlocked || r.reportedUser.isDisabled ? (
                  <Badge tone="bad">Disabled</Badge>
                ) : null}
              </div>
              <div className="user-cell__email">{r.reportedUser.email}</div>
            </div>
          </div>
        ) : (
          <span>
            {r.targetType} · {r.targetId.slice(0, 8)}…
          </span>
        ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (r) => (
        <div>
          <div>{REASON_LABEL[r.reason] ?? r.reason}</div>
          {r.details ? <div className="ad-card__meta">{r.details}</div> : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>,
    },
    {
      key: 'created',
      header: 'Reported',
      render: (r) => new Date(r.createdAt).toLocaleString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '360px',
      render: (r) => (
        <div className="row-actions">
          {r.reportedUser ? (
            <button
              type="button"
              className="btn btn--sm btn--danger"
              disabled={disableUserMutation.isPending}
              onClick={() => disableWithReason(r.reportedUser!.id, r.reason, r.details)}
            >
              Disable reported user
            </button>
          ) : null}
          <ConfirmButton
            label="Block reporter"
            confirmLabel="Confirm block"
            tone="danger"
            disabled={blockUserMutation.isPending}
            onConfirm={() => blockUserMutation.mutate({ id: r.reporter.id, value: true })}
          />
          {r.status !== 'dismissed' ? (
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ id: r.id, status: 'dismissed' })}
            >
              Dismiss
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle={
          reportsQuery.data
            ? `${reportsQuery.data.length} report${reportsQuery.data.length === 1 ? '' : 's'} submitted`
            : undefined
        }
      />

      {reportsQuery.isLoading ? <div className="empty-state">Loading reports…</div> : null}
      {reportsQuery.isError ? (
        <div className="form-error">{errorMessage(reportsQuery.error, 'Could not load reports.')}</div>
      ) : null}
      {(disableUserMutation.isError || blockUserMutation.isError || statusMutation.isError) ? (
        <div className="form-error">
          {errorMessage(
            disableUserMutation.error ?? blockUserMutation.error ?? statusMutation.error,
            'Action failed. Please try again.',
          )}
        </div>
      ) : null}

      {reportsQuery.data ? (
        <DataTable
          columns={columns}
          rows={reportsQuery.data}
          getRowKey={(r) => r.id}
          emptyLabel="No reports have been submitted yet."
        />
      ) : null}
    </>
  );
}
