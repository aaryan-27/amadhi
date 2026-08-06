import Link from "next/link";
import { ListingForm, emptyListing } from "../listing-form";
import { getListingFormOptions } from "../form-options";

export const metadata = { title: "Add listing · Amadhi admin" };

export default async function AdminListingCreatePage() {
  const { cities, operators, amenities } = await getListingFormOptions();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/listings" className="text-sm text-navy-300 hover:text-cream-100">← Back to listings</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-cream-100">Add listing</h1>
      <p className="mt-1 text-sm text-navy-300">
        Saves as a draft unless you set the status to Published. Name, city and locality are the only required fields.
      </p>
      <div className="mt-6">
        <ListingForm
          mode="create"
          initial={emptyListing(cities[0]?.id ?? "")}
          cities={cities}
          operators={operators}
          amenities={amenities}
        />
      </div>
    </div>
  );
}
