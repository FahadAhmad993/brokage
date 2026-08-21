import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { ConfirmButton } from '../components/ConfirmButton';
import {
  fetchCommunities,
  fetchDeletedCommunities,
  createCommunity,
  deleteCommunity,
  restoreCommunity,
  type Community,
  type DeletedCommunity,
} from '../api/admin';
import { errorMessage } from '../api/client';

function daysLeft(restoreExpiresAt: string): number {
  const ms = new Date(restoreExpiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function CommunitiesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'active' | 'deleted'>('active');
  const [title, setTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const communitiesQuery = useQuery({ queryKey: ['admin', 'communities'], queryFn: fetchCommunities });
  const deletedQuery = useQuery({
    queryKey: ['admin', 'communities', 'deleted'],
    queryFn: fetchDeletedCommunities,
    enabled: tab === 'deleted',
  });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'communities'] });
    void queryClient.invalidateQueries({ queryKey: ['admin', 'communities', 'deleted'] });
  };

  const createMutation = useMutation({
    mutationFn: (t: string) => createCommunity(t),
    onSuccess: () => {
      setTitle('');
      invalidateAll();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => deleteCommunity(id, reason),
    onSuccess: () => {
      setDeletingId(null);
      setDeleteReason('');
      invalidateAll();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreCommunity(id),
    onSuccess: invalidateAll,
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length < 2) {
      return;
    }
    createMutation.mutate(trimmed);
  };

  const activeColumns: Column<Community>[] = [
    { key: 'title', header: 'Community', render: (c) => c.title },
    { key: 'members', header: 'Members', width: '120px', render: (c) => c.memberCount },
    { key: 'created', header: 'Created', width: '150px', render: (c) => new Date(c.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      width: '260px',
      render: (c) =>
        deletingId === c.id ? (
          <div className="reject-form">
            <input
              className="field-input"
              placeholder="Reason (optional)"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
            <div className="row-actions">
              <button
                type="button"
                className="btn btn--sm btn--danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: c.id, reason: deleteReason })}
              >
                Confirm delete
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => {
                  setDeletingId(null);
                  setDeleteReason('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn--sm btn--danger" onClick={() => setDeletingId(c.id)}>
            Delete
          </button>
        ),
    },
  ];

  const deletedColumns: Column<DeletedCommunity>[] = [
    { key: 'title', header: 'Community', render: (c) => c.title },
    { key: 'reason', header: 'Reason', render: (c) => c.deletedReason || '—' },
    { key: 'deletedAt', header: 'Deleted', width: '150px', render: (c) => new Date(c.deletedAt).toLocaleDateString() },
    {
      key: 'expires',
      header: 'Restore window',
      width: '160px',
      render: (c) => `${daysLeft(c.restoreExpiresAt)} day(s) left`,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '160px',
      render: (c) => (
        <ConfirmButton
          label="Restore"
          confirmLabel="Confirm restore"
          disabled={restoreMutation.isPending}
          onConfirm={() => restoreMutation.mutate(c.id)}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Communities"
        subtitle="Each community is its own group chat — messages stay scoped to that community only. Deleting one keeps it recoverable for 7 days."
      />

      <div className="filter-row">
        <button
          type="button"
          className={`chip ${tab === 'active' ? 'chip--active' : ''}`}
          onClick={() => setTab('active')}
        >
          Active
        </button>
        <button
          type="button"
          className={`chip ${tab === 'deleted' ? 'chip--active' : ''}`}
          onClick={() => setTab('deleted')}
        >
          Recently deleted
        </button>
      </div>

      {tab === 'active' ? (
        <>
          <form className="inline-form" onSubmit={onSubmit}>
            <input
              className="field-input"
              placeholder="New community name, e.g. Home Renovation Tips"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <button type="submit" className="btn btn--primary" disabled={createMutation.isPending || title.trim().length < 2}>
              {createMutation.isPending ? 'Creating…' : 'Create community'}
            </button>
          </form>
          {createMutation.isError ? (
            <div className="form-error">{errorMessage(createMutation.error, 'Could not create community.')}</div>
          ) : null}
          {deleteMutation.isError ? (
            <div className="form-error">{errorMessage(deleteMutation.error, 'Could not delete community.')}</div>
          ) : null}

          {communitiesQuery.isLoading ? <div className="empty-state">Loading communities…</div> : null}
          {communitiesQuery.isError ? (
            <div className="form-error">{errorMessage(communitiesQuery.error, 'Could not load communities.')}</div>
          ) : null}
          {communitiesQuery.data ? (
            <DataTable
              columns={activeColumns}
              rows={communitiesQuery.data}
              getRowKey={(c) => c.id}
              emptyLabel="No communities yet — create the first one above."
            />
          ) : null}
        </>
      ) : (
        <>
          {restoreMutation.isError ? (
            <div className="form-error">{errorMessage(restoreMutation.error, 'Could not restore community.')}</div>
          ) : null}
          {deletedQuery.isLoading ? <div className="empty-state">Loading…</div> : null}
          {deletedQuery.data ? (
            <DataTable
              columns={deletedColumns}
              rows={deletedQuery.data}
              getRowKey={(c) => c.id}
              emptyLabel="Nothing in the last 7 days — deleted communities appear here until their restore window passes."
            />
          ) : null}
        </>
      )}
    </>
  );
}
