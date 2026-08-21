import {
  GroupAd,
  ChatListingRef,
} from '../types/models';

export function groupAdToListingRef(
  ad: GroupAd,
): ChatListingRef {
  return {
    id: ad.id,
    title: ad.title,
    imageUrl: ad.images?.[0] ?? '',
    location: ad.location ?? ad.city ?? '',
    priceMonthly: 0,
  };
}