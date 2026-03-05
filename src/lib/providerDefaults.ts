import doctorMaleAvatar from "@/assets/doctor-male-avatar.png";
import doctorFemaleAvatar from "@/assets/doctor-female-avatar.png";
import hospitalDefault from "@/assets/hospital-default.png";
import labDefault from "@/assets/lab-default.png";
import pharmacyDefault from "@/assets/pharmacy-default.png";

export function getDoctorAvatar(gender?: string | null, imageUrl?: string | null): string {
  if (imageUrl) return imageUrl;
  if (gender === "female") return doctorFemaleAvatar;
  return doctorMaleAvatar;
}

export function getHospitalImage(imageUrl?: string | null): string {
  return imageUrl || hospitalDefault;
}

export function getLabImage(imageUrl?: string | null): string {
  return imageUrl || labDefault;
}

export function getPharmacyImage(imageUrl?: string | null): string {
  return imageUrl || pharmacyDefault;
}

export { doctorMaleAvatar, doctorFemaleAvatar, hospitalDefault, labDefault, pharmacyDefault };
