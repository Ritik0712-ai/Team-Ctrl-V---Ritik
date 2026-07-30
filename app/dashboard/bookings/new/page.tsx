"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CalendarPlus, Search, Users, MapPin, Plus, X, ChevronRight, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import type { Venue, EquipmentType } from "@/lib/types";
import styles from "./page.module.css";

type Step = 1 | 2 | 3 | 4;

const EQUIPMENT_OPTIONS: Array<{ value: EquipmentType; label: string }> = [
  { value: "LAPTOP", label: "Laptop" },
  { value: "PROJECTOR", label: "Projector" },
  { value: "MICROPHONE", label: "Microphone" },
  { value: "SPEAKER", label: "Speaker" },
  { value: "STANDING_BOARD", label: "Standing Board" },
  { value: "WHITEBOARD", label: "Whiteboard" },
  { value: "EXTENSION_CORD", label: "Extension Cord" },
];

interface Segment {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface FormData {
  venue_id: string;
  event_title: string;
  event_description: string;
  segments: Segment[];
  expected_attendees: string;
  equipment_requests: EquipmentType[];
}

export default function NewBookingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [query, setQuery] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    venue_id: "",
    event_title: "",
    event_description: "",
    segments: [{ id: crypto.randomUUID(), date: "", start_time: "09:00", end_time: "17:00" }],
    expected_attendees: "",
    equipment_requests: [],
  });

  // Step 1: Fetch venues
  useEffect(() => {
    const fetchVenues = async () => {
      setLoading(true);
      const res = await fetch("/api/venues");
      const data = await res.json();
      if (data.success) {
        setVenues(data.data);
      }
      setLoading(false);
    };
    fetchVenues();
  }, []);

  const filteredVenues = venues.filter((v) => {
    if (!query) return true;
    return (
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.building.toLowerCase().includes(query.toLowerCase())
    );
  });

  const handleVenueSelect = (venue: Venue) => {
    setSelectedVenue(venue);
    setFormData((f) => ({ ...f, venue_id: venue.id }));
    setStep(2);
  };

  const addSegment = () => {
    setFormData((f) => ({
      ...f,
      segments: [
        ...f.segments,
        { id: crypto.randomUUID(), date: "", start_time: "09:00", end_time: "17:00" },
      ],
    }));
  };

  const removeSegment = (id: string) => {
    if (formData.segments.length === 1) return;
    setFormData((f) => ({
      ...f,
      segments: f.segments.filter((s) => s.id !== id),
    }));
  };

  const updateSegment = (id: string, field: keyof Segment, value: string) => {
    setFormData((f) => ({
      ...f,
      segments: f.segments.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const toggleEquipment = (eq: EquipmentType) => {
    setFormData((f) => ({
      ...f,
      equipment_requests: f.equipment_requests.includes(eq)
        ? f.equipment_requests.filter((e) => e !== eq)
        : [...f.equipment_requests, eq],
    }));
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    for (const seg of formData.segments) {
      if (!seg.date) {
        newErrors.date = "Date is required for all segments";
        break;
      }
      if (!seg.start_time || !seg.end_time) {
        newErrors.time = "Start and end times are required";
        break;
      }
      if (seg.start_time >= seg.end_time) {
        newErrors.time = "End time must be after start time";
        break;
      }
    }

    if (!formData.expected_attendees || parseInt(formData.expected_attendees) <= 0) {
      newErrors.expected_attendees = "Please enter expected attendees";
    }

    if (selectedVenue && parseInt(formData.expected_attendees) > selectedVenue.capacity) {
      newErrors.expected_attendees = `Venue capacity is ${selectedVenue.capacity}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.event_title.trim() || formData.event_title.length < 5) {
      newErrors.event_title = "Event title must be at least 5 characters";
    }
    if (!formData.event_description.trim() || formData.event_description.length < 10) {
      newErrors.event_description = "Description must be at least 10 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep3()) {
      setStep(3);
      return;
    }

    setSubmitting(true);

    const payload = {
      venue_id: formData.venue_id,
      event_title: formData.event_title.trim(),
      event_description: formData.event_description.trim(),
      segments: formData.segments.map((s) => ({
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
      })),
      expected_attendees: parseInt(formData.expected_attendees),
      equipment_requests: formData.equipment_requests,
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error("Booking conflict: venue is already reserved for this time slot");
          setStep(2);
          return;
        }
        toast.error(data.error ?? "Failed to submit booking");
        return;
      }

      toast.success("Booking request submitted successfully!");
      router.push("/dashboard/bookings");
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div className={styles.page}>
      {/* Progress indicator */}
      <div className={styles.progress}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`${styles.progressStep} ${step >= s ? styles.active : ""} ${step === s ? styles.current : ""}`}>
            <div className={styles.progressDot}>{step > s ? "✓" : s}</div>
            <span>{["Select Venue", "Event Details", "Review & Submit", "Done"][s - 1]}</span>
          </div>
        ))}
      </div>

      {/* STEP 1: Venue Selection */}
      {step === 1 && (
        <div className={styles.step}>
          <div className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>Select a Venue</h2>
            <p className={styles.stepSubtitle}>Search and choose from available venues</p>
          </div>

          <div className={styles.searchBar}>
            <Input
              placeholder="Search by name, building..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>

          {filteredVenues.length === 0 ? (
            <EmptyState
              icon={<MapPin size={40} />}
              title="No venues found"
              description="Try adjusting your search query"
            />
          ) : (
            <div className={styles.venueGrid}>
              {filteredVenues.map((venue) => (
                <Card
                  key={venue.id}
                  hover
                  className={`${styles.venueOption} ${selectedVenue?.id === venue.id ? styles.selected : ""}`}
                  onClick={() => handleVenueSelect(venue)}
                >
                  <CardContent>
                    <div className={styles.venueOptionHeader}>
                      <h3 className={styles.venueOptionName}>{venue.name}</h3>
                      <Badge>{venue.venue_type.replace("_", " ")}</Badge>
                    </div>
                    <p className={styles.venueOptionBuilding}>
                      <MapPin size={12} /> {venue.building} · Floor {venue.floor}
                    </p>
                    <div className={styles.venueOptionCapacity}>
                      <Users size={13} />
                      <span>Capacity: <strong>{venue.capacity}</strong></span>
                    </div>
                    {venue.amenities && venue.amenities.length > 0 && (
                      <div className={styles.amenities}>
                        {venue.amenities.slice(0, 4).map((a) => (
                          <span key={a} className={styles.amenityTag}>{a}</span>
                        ))}
                      </div>
                    )}
                    <button className={styles.selectBtn}>
                      Select Venue <ChevronRight size={14} />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Event Details */}
      {step === 2 && (
        <div className={styles.step}>
          <div className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>Event Details</h2>
            <p className={styles.stepSubtitle}>Configure time slots and requirements</p>
          </div>

          {selectedVenue && (
            <div className={styles.selectedVenueBanner}>
              <div>
                <strong>{selectedVenue.name}</strong>
                <span> · {selectedVenue.building} · Capacity {selectedVenue.capacity}</span>
              </div>
              <button className={styles.changeBtn} onClick={() => setStep(1)}>
                Change
              </button>
            </div>
          )}

          {/* Time Segments */}
          <Card className={styles.section}>
            <CardContent>
              <h3 className={styles.sectionTitle}>
                <CalendarPlus size={16} /> Date & Time
              </h3>
              <p className={styles.sectionHint}>
                Add one row per day of your event. Each day will have its own booking segment.
              </p>

              {errors.date && (
                <div className={styles.errorBanner}><AlertCircle size={14} />{errors.date}</div>
              )}
              {errors.time && (
                <div className={styles.errorBanner}><AlertCircle size={14} />{errors.time}</div>
              )}

              <div className={styles.segments}>
                {formData.segments.map((seg, idx) => (
                  <div key={seg.id} className={styles.segmentRow}>
                    <span className={styles.segmentLabel}>Day {idx + 1}</span>
                    <Input
                      type="date"
                      value={seg.date}
                      onChange={(e) => updateSegment(seg.id, "date", e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <Input
                      type="time"
                      value={seg.start_time}
                      onChange={(e) => updateSegment(seg.id, "start_time", e.target.value)}
                      label="From"
                    />
                    <Input
                      type="time"
                      value={seg.end_time}
                      onChange={(e) => updateSegment(seg.id, "end_time", e.target.value)}
                      label="To"
                    />
                    {formData.segments.length > 1 && (
                      <button
                        className={styles.removeSegBtn}
                        onClick={() => removeSegment(seg.id)}
                        aria-label="Remove segment"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button className={styles.addSegBtn} onClick={addSegment}>
                <Plus size={14} /> Add Another Day
              </button>
            </CardContent>
          </Card>

          {/* Attendees */}
          <Card className={styles.section}>
            <CardContent>
              <h3 className={styles.sectionTitle}>
                <Users size={16} /> Expected Attendees
              </h3>
              <Input
                type="number"
                placeholder="e.g. 80"
                value={formData.expected_attendees}
                onChange={(e) => setFormData((f) => ({ ...f, expected_attendees: e.target.value }))}
                error={errors.expected_attendees}
                hint={selectedVenue ? `Venue capacity: ${selectedVenue.capacity}` : undefined}
                min={1}
                max={selectedVenue?.capacity}
              />
            </CardContent>
          </Card>

          {/* Equipment */}
          <Card className={styles.section}>
            <CardContent>
              <h3 className={styles.sectionTitle}>Equipment Requests (Optional)</h3>
              <p className={styles.sectionHint}>Select any equipment you need</p>
              <div className={styles.equipmentGrid}>
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <button
                    key={eq.value}
                    type="button"
                    className={`${styles.equipmentBtn} ${formData.equipment_requests.includes(eq.value) ? styles.selected : ""}`}
                    onClick={() => toggleEquipment(eq.value)}
                  >
                    {eq.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className={styles.stepActions}>
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => { if (validateStep2()) setStep(3); }}>
              Continue <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <div className={styles.step}>
          <div className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>Review & Submit</h2>
            <p className={styles.stepSubtitle}>Confirm your booking details before submitting</p>
          </div>

          <div className={styles.reviewGrid}>
            {/* Event Info */}
            <Card className={styles.reviewCard}>
              <CardContent>
                <h3 className={styles.reviewTitle}>Event Information</h3>
                <div className={styles.reviewField}>
                  <label>Venue</label>
                  <span>{selectedVenue?.name} ({selectedVenue?.building})</span>
                </div>
                <Input
                  label="Event Title"
                  value={formData.event_title}
                  onChange={(e) => setFormData((f) => ({ ...f, event_title: e.target.value }))}
                  error={errors.event_title}
                  placeholder="e.g. Tech Workshop: Introduction to AI"
                />
                <Textarea
                  label="Event Description"
                  value={formData.event_description}
                  onChange={(e) => setFormData((f) => ({ ...f, event_description: e.target.value }))}
                  error={errors.event_description}
                  placeholder="Describe your event..."
                  rows={4}
                />
                <div className={styles.reviewField}>
                  <label>Expected Attendees</label>
                  <span>{formData.expected_attendees}</span>
                </div>
                {formData.equipment_requests.length > 0 && (
                  <div className={styles.reviewField}>
                    <label>Equipment</label>
                    <div className={styles.reviewTags}>
                      {formData.equipment_requests.map((eq) => (
                        <Badge key={eq}>{eq.replace("_", " ")}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card className={styles.reviewCard}>
              <CardContent>
                <h3 className={styles.reviewTitle}>Schedule</h3>
                <div className={styles.scheduleList}>
                  {formData.segments.map((seg, idx) => (
                    <div key={seg.id} className={styles.scheduleItem}>
                      <span className={styles.scheduleDay}>Day {idx + 1}</span>
                      <div className={styles.scheduleTimes}>
                        <span>{seg.date}</span>
                        <span>{seg.start_time} – {seg.end_time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className={styles.stepActions}>
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              icon={<CalendarPlus size={16} />}
            >
              Submit Booking Request
            </Button>
          </div>

          <p className={styles.submitNote}>
            Your request will be sent to the Faculty Coordinator for approval, then to DSW.
          </p>
        </div>
      )}
    </div>
  );
}
