import { useState } from 'react';
import { Badge } from './Badge';
import type { CommunityAd, AdStatus } from '../api/admin';

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
  return `${h}h ${m}m remaining`;
}

export function AdDetailModal({ ad, onClose }: { ad: CommunityAd; onClose: () => void }) {
  const [activeImage, setActiveImage] = useState(0);
  const remaining = formatRemaining(ad);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__header">
          <h2>{ad.title}</h2>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>

        {ad.images.length > 0 ? (
          <div className="modal-gallery">
            <img className="modal-gallery__main" src={ad.images[activeImage] ?? ad.images[0]} alt="" />
            {ad.images.length > 1 ? (
              <div className="modal-gallery__thumbs">
                {ad.images.map((img, i) => (
                  <button
                    key={img + i}
                    type="button"
                    className={`modal-gallery__thumb ${i === activeImage ? 'modal-gallery__thumb--active' : ''}`}
                    onClick={() => setActiveImage(i)}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="empty-state">No images.</div>
        )}

        <div className="modal-detail-grid">
          <div className="modal-detail-row">
            <span className="modal-detail-label">Status</span>
            <Badge tone={STATUS_TONE[ad.status]}>{STATUS_LABEL[ad.status]}</Badge>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Posted by</span>
            <span>
              {ad.authorName ?? 'User'}
              {ad.authorEmail ? ` (${ad.authorEmail})` : ''}
            </span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">City</span>
            <span>{ad.city || '—'}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Area</span>
            <span>{ad.area || '—'}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Duration</span>
            <span>{ad.durationHours} hour{ad.durationHours === 1 ? '' : 's'}</span>
          </div>
          <div className="modal-detail-row">
            <span className="modal-detail-label">Price</span>
            <span>PKR {ad.price}</span>
          </div>
          {remaining ? (
            <div className="modal-detail-row">
              <span className="modal-detail-label">Time left</span>
              <span>{remaining}</span>
            </div>
          ) : null}
          {ad.expiresAt ? (
            <div className="modal-detail-row">
              <span className="modal-detail-label">Expires at</span>
              <span>{new Date(ad.expiresAt).toLocaleString()}</span>
            </div>
          ) : null}
          <div className="modal-detail-row">
            <span className="modal-detail-label">Submitted</span>
            <span>{new Date(ad.createdAt).toLocaleString()}</span>
          </div>
          {ad.rejectionReason ? (
            <div className="modal-detail-row">
              <span className="modal-detail-label">Rejection reason</span>
              <span>{ad.rejectionReason}</span>
            </div>
          ) : null}
        </div>

        <div className="modal-detail-desc">
          <span className="modal-detail-label">Description</span>
          <p>{ad.description}</p>
        </div>
      </div>
    </div>
  );
}
