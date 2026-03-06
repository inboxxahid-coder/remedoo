import { getDistanceKm } from "@/hooks/useGeolocation";

interface DoctorForRanking {
  id: string;
  name: string;
  rating: number | null;
  consultation_fee: number | null;
  experience_years: number | null;
  is_featured: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number;
  // review count from joined data
  review_count?: number;
}

/**
 * Smart doctor ranking algorithm.
 * Considers: rating, distance, experience, reviews, featured status.
 * Returns a composite score (higher = better).
 */
export function calculateDoctorScore(
  doctor: DoctorForRanking,
  userLat?: number | null,
  userLng?: number | null
): number {
  let score = 0;

  // Rating weight (0-5) → 0-30 points
  const rating = doctor.rating || 0;
  score += rating * 6;

  // Distance weight → 0-25 points (closer = better)
  if (userLat != null && userLng != null && doctor.latitude != null && doctor.longitude != null) {
    const dist = doctor.distance_km ?? getDistanceKm(userLat, userLng, doctor.latitude, doctor.longitude);
    // Within 2km = 25pts, 5km = 20pts, 10km = 15pts, 20km+ = 5pts
    if (dist <= 2) score += 25;
    else if (dist <= 5) score += 20;
    else if (dist <= 10) score += 15;
    else if (dist <= 20) score += 10;
    else score += 5;
  }

  // Experience weight → 0-20 points
  const exp = doctor.experience_years || 0;
  score += Math.min(exp, 20);

  // Review count weight → 0-15 points
  const reviews = doctor.review_count || 0;
  if (reviews >= 50) score += 15;
  else if (reviews >= 20) score += 12;
  else if (reviews >= 10) score += 8;
  else if (reviews >= 5) score += 5;
  else score += reviews;

  // Featured bonus → 10 points
  if (doctor.is_featured) score += 10;

  return score;
}

/**
 * Sort doctors by smart ranking score (descending).
 */
export function rankDoctors<T extends DoctorForRanking>(
  doctors: T[],
  userLat?: number | null,
  userLng?: number | null
): (T & { rank_score: number })[] {
  return doctors
    .map(d => ({ ...d, rank_score: calculateDoctorScore(d, userLat, userLng) }))
    .sort((a, b) => b.rank_score - a.rank_score);
}
