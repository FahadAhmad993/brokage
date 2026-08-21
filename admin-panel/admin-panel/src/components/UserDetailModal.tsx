import { useQuery } from '@tanstack/react-query';
import { Badge } from './Badge';
import { fetchUserDetail, type AdStatus } from '../api/admin';
import { errorMessage } from '../api/client';

const STATUS_TONE: Record<AdStatus, 'good' | 'warn' | 'bad' | 'neutral'> = {
  pending: 'warn',
  active: 'good',
  expired: 'neutral',
  rejected: 'bad',
};

export function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const detailQuery = useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: () => fetchUserDetail(userId),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__header">
          <h2>{detailQuery.data?.displayName ?? 'User profile'}</h2>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {detailQuery.isLoading ? <div className="empty-state">Loading…</div> : null}
        {detailQuery.isError ? (
          <div className="form-error">{errorMessage(detailQuery.error, 'Could not load this profile.')}</div>
        ) : null}

        {detailQuery.data ? (
          <>
            <div className="user-detail-header">
              <div className="user-detail-avatar">
                {detailQuery.data.avatarUrl ? (
                  <img src={detailQuery.data.avatarUrl} alt="" />
                ) : (
                  detailQuery.data.displayName.slice(0, 1).toUpperCase()
                )}
              </div>
              <div>
                <div className="modal-detail-row">
                  <span className="modal-detail-label">Status</span>
                  <span>
                    {detailQuery.data.isBlocked ? (
                      <Badge tone="bad">Blocked</Badge>
                    ) : detailQuery.data.isDisabled ? (
                      <Badge tone="warn">Disabled</Badge>
                    ) : (
                      <Badge tone="good">Active</Badge>
                    )}
                    {detailQuery.data.isAdmin ? <Badge tone="good">Admin</Badge> : null}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-detail-grid">
              <div className="modal-detail-row">
                <span className="modal-detail-label">Email</span>
                <span>{detailQuery.data.email}</span>
              </div>
              <div className="modal-detail-row">
                <span className="modal-detail-label">Phone</span>
                <span>{detailQuery.data.phone || '—'}</span>
              </div>
              <div className="modal-detail-row">
                <span className="modal-detail-label">Estate / business name</span>
                <span>{detailQuery.data.estateName || '—'}</span>
              </div>
              <div className="modal-detail-row">
                <span className="modal-detail-label">Joined</span>
                <span>{new Date(detailQuery.data.createdAt).toLocaleString()}</span>
              </div>
              {detailQuery.data.disabledReason ? (
                <div className="modal-detail-row">
                  <span className="modal-detail-label">Disabled reason</span>
                  <span>{detailQuery.data.disabledReason}</span>
                </div>
              ) : null}
            </div>

            {detailQuery.data.bio ? (
              <div className="modal-detail-desc">
                <span className="modal-detail-label">Bio</span>
                <p>{detailQuery.data.bio}</p>
              </div>
            ) : null}

            <div className="modal-detail-desc">
              <span className="modal-detail-label">
                Ads posted ({detailQuery.data.ads.length})
              </span>
              {detailQuery.data.ads.length === 0 ? (
                <p>This user hasn't posted any community ads.</p>
              ) : (
                <div className="user-detail-ads">
                  {detailQuery.data.ads.map((ad) => (
                    <div key={ad.id} className="user-detail-ad-card">
                      {ad.images[0] ? <img src={ad.images[0]} alt="" /> : null}
                      <div className="user-detail-ad-card__body">
                        <div className="ad-card__top">
                          <strong>{ad.title}</strong>
                          <Badge tone={STATUS_TONE[ad.status]}>{ad.status}</Badge>
                        </div>
                        <span className="ad-card__meta">
                          {[ad.area, ad.city].filter(Boolean).join(', ') || '—'} · PKR {ad.price}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
