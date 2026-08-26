import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * Deletes the actual image files from Cloudinary when a community ad is
 * removed, so nothing is left orphaned in storage — mirrors what the
 * requirement asked for "Supabase Storage" cleanup, adapted to this app's
 * real image host (the mobile app uploads ad/chat photos straight to
 * Cloudinary — see `brokage-mobile-app/src/lib/cloudinary.ts` — Supabase is
 * only used here as the Postgres host, not for file storage).
 *
 * Uses Cloudinary's signed Admin API directly over `fetch` (no SDK
 * dependency needed). Silently no-ops (with a warning log) if
 * CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET aren't configured, so it never
 * blocks the actual ad deletion — the database row is always removed
 * either way.
 */
@Injectable()
export class CloudinaryCleanupService {
  private readonly logger = new Logger(CloudinaryCleanupService.name);

  private get cloudName(): string {
    return process.env.CLOUDINARY_CLOUD_NAME ?? 'm7ciqzwb';
  }

  private get apiKey(): string | undefined {
    return process.env.CLOUDINARY_API_KEY;
  }

  private get apiSecret(): string | undefined {
    return process.env.CLOUDINARY_API_SECRET;
  }

  /** Best-effort delete of every image URL that belonged to a removed ad. */
  async deleteImages(imageUrls: string[]): Promise<void> {
    if (!imageUrls?.length) return;
    if (!this.apiKey || !this.apiSecret) {
      this.logger.warn(
        'CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET not set — skipping remote image cleanup (DB row is still deleted).',
      );
      return;
    }
    await Promise.all(imageUrls.map((url) => this.deleteOne(url)));
  }

  private async deleteOne(url: string): Promise<void> {
    const publicId = this.extractPublicId(url);
    if (!publicId) return;
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createHash('sha1')
        .update(`public_id=${publicId}&timestamp=${timestamp}${this.apiSecret}`)
        .digest('hex');

      const body = new URLSearchParams({
        public_id: publicId,
        timestamp: String(timestamp),
        api_key: this.apiKey as string,
        signature,
      });

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
        { method: 'POST', body },
      );
      if (!res.ok) {
        this.logger.warn(
          `Cloudinary destroy failed for ${publicId}: HTTP ${res.status}`,
        );
      }
    } catch (err) {
      this.logger.warn(`Cloudinary destroy errored for ${publicId}`, err as Error);
    }
  }

  /** `.../upload/v123456/folder/name.jpg` -> `folder/name` */
  private extractPublicId(url: string): string | null {
    try {
      const path = new URL(url).pathname;
      const uploadIdx = path.indexOf('/upload/');
      if (uploadIdx === -1) return null;
      let rest = path.slice(uploadIdx + '/upload/'.length);
      // Drop an optional version segment, e.g. "v1699999999/"
      rest = rest.replace(/^v\d+\//, '');
      // Drop the file extension.
      const lastDot = rest.lastIndexOf('.');
      return lastDot === -1 ? rest : rest.slice(0, lastDot);
    } catch {
      return null;
    }
  }
}
