import casaMar from "@/assets/casa-mar.jpg";
import refugio from "@/assets/refugio-pirineos.jpg";
import loft from "@/assets/loft-barcelona.jpg";

export const propertyImages: Record<string, string> = {
  "villa-brisa-las-terrenas": casaMar,
  "cabana-pinar-jarabacoa": refugio,
  "loft-ciudad-colonial": loft,
};

export const propertyFallbackImage = casaMar;