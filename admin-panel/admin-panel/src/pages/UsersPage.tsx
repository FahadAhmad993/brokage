import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { DataTable, type Column } from '../components/DataTable';
import { Badge } from '../components/Badge';
import { ConfirmButton } from '../components/ConfirmButton';
import { UserDetailModal } from '../components/UserDetailModal';
import {
  fetchUsers,
  setUserBlocked,
  setUserDisabled,
  deleteUser,
  type AdminUser,
} from '../api/admin';
import { errorMessage } from '../api/client';

export function UsersPage() {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ['admin', 'users'], queryFn: fetchUsers });
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });

  const blockMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => setUserBlocked(id, value),
    onSuccess: invalidate,
  });
  const disableMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => setUserDisabled(id, value),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: invalidate,
  });

  const columns: Column<AdminUser>[] = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <button type="button" className="user-cell user-cell--clickable" onClick={() => setDetailUserId(u.id)}>
          <div className="user-cell__avatar">
            {u.avatarUrl ? <img src={u.avatarUrl} alt="" /> : u.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="user-cell__name">
              {u.displayName} {u.isAdmin ? <Badge tone="good">Admin</Badge> : null}
            </div>
            <div className="user-cell__email">{u.email}</div>
          </div>
        </button>
      ),
    },
    { key: 'phone', header: 'Phone', render: (u) => u.phone || '—' },
    { key: 'estate', header: 'Estate', render: (u) => u.estateName || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (u) =>
        u.isBlocked ? (
          <Badge tone="bad">Blocked</Badge>
        ) : u.isDisabled ? (
          <Badge tone="warn">Disabled</Badge>
        ) : (
          <Badge tone="good">Active</Badge>
        ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (u) => new Date(u.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '320px',
      render: (u) => (
        <div className="row-actions">
          <ConfirmButton
            label={u.isBlocked ? 'Unblock' : 'Block'}
            confirmLabel={u.isBlocked ? 'Confirm unblock' : 'Confirm block'}
            tone={u.isBlocked ? 'default' : 'danger'}
            disabled={blockMutation.isPending}
            onConfirm={() => blockMutation.mutate({ id: u.id, value: !u.isBlocked })}
          />
          <ConfirmButton
            label={u.isDisabled ? 'Enable' : 'Disable'}
            confirmLabel={u.isDisabled ? 'Confirm enable' : 'Confirm disable'}
            tone={u.isDisabled ? 'default' : 'danger'}
            disabled={disableMutation.isPending}
            onConfirm={() => disableMutation.mutate({ id: u.id, value: !u.isDisabled })}
          />
          <ConfirmButton
            label="Delete"
            confirmLabel="Confirm delete"
            tone="danger"
            disabled={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate(u.id)}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={
          usersQuery.data
            ? `${usersQuery.data.length} registered ${usersQuery.data.length === 1 ? 'user' : 'users'}`
            : undefined
        }
      />

      {usersQuery.isLoading ? <div className="empty-state">Loading users…</div> : null}
      {usersQuery.isError ? (
        <div className="form-error">{errorMessage(usersQuery.error, 'Could not load users.')}</div>
      ) : null}
      {(blockMutation.isError || disableMutation.isError || deleteMutation.isError) ? (
        <div className="form-error">
          {errorMessage(
            blockMutation.error ?? disableMutation.error ?? deleteMutation.error,
            'Action failed. Please try again.',
          )}
        </div>
      ) : null}

      {usersQuery.data ? (
        <DataTable
          columns={columns}
          rows={usersQuery.data}
          getRowKey={(u) => u.id}
          emptyLabel="No users have registered yet."
        />
      ) : null}
      {detailUserId ? (
        <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} />
      ) : null}
    </>
  );
}
