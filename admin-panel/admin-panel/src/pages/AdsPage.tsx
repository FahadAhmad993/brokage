import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { PageHeader } from '../components/PageHeader';
import { Badge } from '../components/Badge';
import { ConfirmButton } from '../components/ConfirmButton';
import { AdDetailModal } from '../components/AdDetailModal';
import {
  fetchCommunityAds,
  verifyAd,
  rejectAd,
  deleteAd,
  type CommunityAd,
  type AdStatus,
} from '../api/admin';
import { errorMessage } from '../api/client';

const STATUS_TONE: Record<AdStatus, 'good' | 'warn' | 'bad' | 'neutral'> = {
  pending: 'warn',
  active: 'good',
  expired: 'neutral',
  rejected: 'bad',
};

const STATUS_LABEL: Record<AdStatus, string> = {
  pending: 'Pending review',
  active: 'Active',
  expired: 'Expired',
  rejected: 'Rejected',
};

function formatRemaining(ad: CommunityAd) {
  if (ad.status !== 'active' || ad.remainingSeconds == null) return null;
  const h = Math.floor(ad.remainingSeconds / 3600);
  const m = Math.floor((ad.remainingSeconds % 3600) / 60);
  return `${h}h ${m}m left`;
}

export function AdsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<AdStatus | 'all'>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailAd, setDetailAd] = useState<CommunityAd | null>(null);

  const adsQuery = useQuery({ queryKey: ['admin', 'community-posts'], queryFn: fetchCommunityAds });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'community-posts'] });

  const verifyMutation = useMutation({ mutationFn: (id: string) => verifyAd(id), onSuccess: invalidate });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectAd(id, reason),
    onSuccess: () => {
      invalidate();
      setRejectingId(null);
      setRejectReason('');
    },
  });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteAd(id), onSuccess: invalidate });

  const filteredAds = (adsQuery.data ?? []).filter(
    (ad) => statusFilter === 'all' || ad.status === statusFilter,
  );

  // Keep the open detail modal's data fresh (e.g. remaining time / status
  // ticking over) as the list refetches, without closing it on every poll.
  const liveDetailAd = detailAd ? filteredAds.find((a) => a.id === detailAd.id) ?? detailAd : null;

  return (
    <>
      <PageHeader
        title="Ads"
        subtitle="Community posts submitted by users. Click a card for full details — verify to publish for its chosen duration, or reject with a reason."
      />

      <div className="filter-row">
        {(['pending', 'active', 'expired', 'rejected', 'all'] as const).map((s) => (
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

      {adsQuery.isLoading ? <div className="empty-state">Loading ads…</div> : null}
      {adsQuery.isError ? (
        <div className="form-error">{errorMessage(adsQuery.error, 'Could not load ads.')}</div>
      ) : null}
      {(verifyMutation.isError || rejectMutation.isError || deleteMutation.isError) ? (
        <div className="form-error">
          {errorMessage(
            verifyMutation.error ?? rejectMutation.error ?? deleteMutation.error,
            'Action failed. Please try again.',
          )}
        </div>
      ) : null}

      {adsQuery.data && filteredAds.length === 0 ? (
        <div className="empty-state">No ads in this view.</div>
      ) : null}

      <div className="ad-grid">
        {filteredAds.map((ad) => (
          <div key={ad.id} className="ad-card">
            <button
              type="button"
              className="ad-card__clickable"
              onClick={() => setDetailAd(ad)}
              aria-label={`View details for ${ad.title}`}
            >
              {ad.images[0] ? <img className="ad-card__image" src={ad.images[0]} alt="" /> : null}
              <div className="ad-card__body">
                <div className="ad-card__top">
                  <h3>{ad.title}</h3>
                  <Badge tone={STATUS_TONE[ad.status]}>{STATUS_LABEL[ad.status]}</Badge>
                </div>
                <p className="ad-card__meta">
                  {ad.authorName ?? 'User'}
                  {ad.authorEmail ? ` · ${ad.authorEmail}` : ''}
                </p>
                <p className="ad-card__meta">
                  {[ad.area, ad.city].filter(Boolean).join(', ') || '—'}
                </p>
                <p className="ad-card__desc">{ad.description}</p>
                <p className="ad-card__meta">
                  {ad.durationHours}h · PKR {ad.price}
                  {formatRemaining(ad) ? ` · ${formatRemaining(ad)}` : ''}
                </p>
                {ad.status === 'rejected' && ad.rejectionReason ? (
                  <p className="ad-card__rejection">Reason: {ad.rejectionReason}</p>
                ) : null}
              </div>
            </button>

            <div className="ad-card__actions">
              {rejectingId === ad.id ? (
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
                      onClick={() => rejectMutation.mutate({ id: ad.id, reason: rejectReason })}
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
                  {ad.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className="btn btn--sm btn--primary"
                        disabled={verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate(ad.id)}
                      >
                        Verify
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--danger"
                        onClick={() => setRejectingId(ad.id)}
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
                    onConfirm={() => deleteMutation.mutate(ad.id)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {liveDetailAd ? <AdDetailModal ad={liveDetailAd} onClose={() => setDetailAd(null)} /> : null}
    </>
  );
}
