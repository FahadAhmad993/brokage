import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { ConfirmButton } from '../components/ConfirmButton';
import {
  fetchDisplayPosts,
  verifyDisplayPost,
  rejectDisplayPost,
  deleteDisplayPostAdmin,
  type AdminDisplayPost,
  type DisplayPostStatus,
} from '../api/admin';
import { errorMessage } from '../api/client';

const STATUS_TONE: Record<DisplayPostStatus, 'good' | 'warn' | 'bad' | 'neutral'> = {
  pending: 'warn',
  active: 'good',
  sold: 'neutral',
  expired: 'neutral',
  rejected: 'bad',
};

const STATUS_LABEL: Record<DisplayPostStatus, string> = {
  pending: 'Pending review',
  active: 'Active',
  sold: 'Sold',
  expired: 'Expired',
  rejected: 'Rejected',
};

const OPTIONAL_FIELD_LABELS: Record<string, string> = {
  bedrooms: 'Bed',
  bathrooms: 'Bath',
  kitchen: 'Kitchen',
  carporch: 'Carporch',
  tvLounge: 'TV Lounge',
};

function summarize(post: AdminDisplayPost) {
  const parts = [`${post.marlaSize} Marla`];
  if (post.city) parts.push(post.city);
  if (post.area) parts.push(post.area);
  for (const [key, label] of Object.entries(OPTIONAL_FIELD_LABELS)) {
    const value = post.extraFields?.[key];
    if (value) parts.push(key === 'bedrooms' || key === 'bathrooms' ? `${value} ${label}` : label);
  }
  return parts.join(' · ');
}

/**
 * Review queue for Display posts (Profile → Display) — the broker's
 * personal storefront ads, separate from the Community feed's ads
 * (AdsPage). Same verify/reject/remove flow, own table/product.
 */
export function DisplayPostsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<DisplayPostStatus | 'all'>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const postsQuery = useQuery({ queryKey: ['admin', 'display-posts'], queryFn: fetchDisplayPosts });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'display-posts'] });

  const verifyMutation = useMutation({ mutationFn: (id: string) => verifyDisplayPost(id), onSuccess: invalidate });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectDisplayPost(id, reason),
    onSuccess: () => {
      invalidate();
      setRejectingId(null);
      setRejectReason('');
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDisplayPostAdmin(id),
    onSuccess: invalidate,
  });

  const filtered = (postsQuery.data ?? []).filter(
    (p) => statusFilter === 'all' || p.status === statusFilter,
  );

  return (
    <>
      <PageHeader
        title="Display Posts"
        subtitle="Posts on brokers' personal Display pages. Verify to publish for the chosen duration, or reject with a reason."
      />

      <div className="filter-row">
        {(['pending', 'active', 'sold', 'expired', 'rejected', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`chip ${statusFilter === s ? 'chip--active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {postsQuery.isLoading ? <div className="empty-state">Loading posts…</div> : null}
      {postsQuery.isError ? (
        <div className="form-error">{errorMessage(postsQuery.error, 'Could not load posts.')}</div>
      ) : null}
      {(verifyMutation.isError || rejectMutation.isError || deleteMutation.isError) ? (
        <div className="form-error">
          {errorMessage(
            verifyMutation.error ?? rejectMutation.error ?? deleteMutation.error,
            'Action failed. Please try again.',
          )}
        </div>
      ) : null}

      {postsQuery.data && filtered.length === 0 ? (
        <div className="empty-state">No posts in this view.</div>
      ) : null}

      <div className="ad-grid">
        {filtered.map((post) => (
          <div key={post.id} className="ad-card">
            <div className="ad-card__clickable">
              {post.images[0] ? <img className="ad-card__image" src={post.images[0]} alt="" /> : null}
              <div className="ad-card__body">
                <div className="ad-card__top">
                  <h3>{summarize(post)}</h3>
                  <Badge tone={STATUS_TONE[post.status]}>{STATUS_LABEL[post.status]}</Badge>
                </div>
                <p className="ad-card__meta">
                  {post.authorName}
                  {post.authorEmail ? ` · ${post.authorEmail}` : ''}
                </p>
                {post.description ? <p className="ad-card__desc">{post.description}</p> : null}
                <p className="ad-card__meta">
                  {post.durationHours}h · PKR {post.price}
                </p>
                {post.status === 'rejected' && post.rejectionReason ? (
                  <p className="ad-card__rejection">Reason: {post.rejectionReason}</p>
                ) : null}
              </div>
            </div>

            <div className="ad-card__actions">
              {rejectingId === post.id ? (
                <div className="reject-form">
                  <textarea
                    className="reject-form__input"
                    placeholder="Reason shown to the user (optional)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                  />
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      disabled={rejectMutation.isPending}
                      onClick={() => rejectMutation.mutate({ id: post.id, reason: rejectReason })}
                    >
                      Confirm reject
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason('');
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="row-actions">
                  {post.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className="btn btn--sm btn--primary"
                        disabled={verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate(post.id)}
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--danger"
                        onClick={() => setRejectingId(post.id)}
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                  <ConfirmButton
                    label="Remove"
                    confirmLabel="Confirm remove"
                    tone="danger"
                    disabled={deleteMutation.isPending}
                    onConfirm={() => deleteMutation.mutate(post.id)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
