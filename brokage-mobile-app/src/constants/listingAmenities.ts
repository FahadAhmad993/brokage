export type AmenityId =
  | 'wifi'
  | 'parking'
  | 'air'
  | 'pool'
  | 'gym'
  | 'pets';

export const AMENITY_OPTIONS: {
  id: AmenityId;
  label: string;
}[] = [
  { id: 'wifi', label: 'High-speed Wifi' },
  { id: 'parking', label: 'Private Parking' },
  { id: 'air', label: 'Central Air' },
  { id: 'pool', label: 'Infinity Pool' },
  { id: 'gym', label: 'Gym Access' },
  { id: 'pets', label: 'Pet Friendly' },
];
