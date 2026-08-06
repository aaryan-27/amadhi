import { db } from "@/lib/db";

/** Select options shared by the create and edit listing pages. */
export async function getListingFormOptions() {
  const [cities, operators, amenities] = await Promise.all([
    db.city.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        localities: { orderBy: { name: "asc" }, select: { id: true, name: true } },
      },
    }),
    db.operator.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.amenity.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { cities, operators, amenities };
}
