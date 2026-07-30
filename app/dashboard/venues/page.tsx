"use client";

import { useState, useEffect } from "react";
import { Search, Users, Building2, MapPin, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import type { Venue } from "@/lib/types";
import styles from "./page.module.css";

const VENUE_TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "SEMINAR_HALL", label: "Seminar Hall" },
  { value: "CONFERENCE_ROOM", label: "Conference Room" },
  { value: "LECTURE_HALL", label: "Lecture Hall" },
  { value: "AUDITORIUM", label: "Auditorium" },
  { value: "LAB", label: "Lab" },
  { value: "OPEN_AREA", label: "Open Area" },
];

const VENUE_TYPE_LABELS: Record<string, string> = {
  SEMINAR_HALL: "Seminar Hall",
  CONFERENCE_ROOM: "Conference Room",
  LECTURE_HALL: "Lecture Hall",
  AUDITORIUM: "Auditorium",
  LAB: "Lab",
  OPEN_AREA: "Open Area",
};

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [venueType, setVenueType] = useState("");
  const [minCapacity, setMinCapacity] = useState("");

  const fetchVenues = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (venueType) params.set("venue_type", venueType);
    if (minCapacity) params.set("min_capacity", minCapacity);

    const res = await fetch(`/api/venues?${params}`);
    const data = await res.json();

    if (data.success) {
      setVenues(data.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVenues();
  }, [venueType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVenues();
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Venues</h1>
          <p className={styles.pageSubtitle}>Browse and search for available venues</p>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className={styles.filters}>
        <div className={styles.filterRow}>
          <Input
            placeholder="Search by name or building..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<Search size={16} />}
            className={styles.searchInput}
          />
          <Select
            options={VENUE_TYPE_OPTIONS}
            value={venueType}
            onChange={(e) => setVenueType(e.target.value)}
            className={styles.typeSelect}
          />
          <Input
            type="number"
            placeholder="Min capacity"
            value={minCapacity}
            onChange={(e) => setMinCapacity(e.target.value)}
            className={styles.capacityInput}
          />
          <button type="submit" className={styles.filterBtn}>
            <SlidersHorizontal size={16} />
            Filter
          </button>
        </div>
      </form>

      {/* Results */}
      {loading ? (
        <PageSpinner />
      ) : venues.length === 0 ? (
        <EmptyState
          icon={<MapPin size={40} strokeWidth={1.5} />}
          title="No venues found"
          description="Try adjusting your search filters"
        />
      ) : (
        <div className={styles.grid}>
          {venues.map((venue) => (
            <Card key={venue.id} className={styles.venueCard} hover>
              <CardContent>
                <div className={styles.venueHeader}>
                  <div>
                    <h3 className={styles.venueName}>{venue.name}</h3>
                    <div className={styles.venueMeta}>
                      <span><Building2 size={12} /> {venue.building}</span>
                      <span>Floor {venue.floor}</span>
                    </div>
                  </div>
                  <Badge>{VENUE_TYPE_LABELS[venue.venue_type] ?? venue.venue_type}</Badge>
                </div>

                <div className={styles.venueStats}>
                  <div className={styles.venueStat}>
                    <Users size={14} />
                    <span>Capacity: <strong>{venue.capacity}</strong></span>
                  </div>
                </div>

                {venue.amenities && venue.amenities.length > 0 && (
                  <div className={styles.amenities}>
                    {venue.amenities.map((a) => (
                      <span key={a} className={styles.amenityTag}>{a}</span>
                    ))}
                  </div>
                )}

                {venue.description && (
                  <p className={styles.description}>{venue.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
