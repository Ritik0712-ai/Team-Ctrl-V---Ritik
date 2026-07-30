"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CalendarPlus, Search, Users, MapPin, Plus, X, ChevronRight, AlertCircle, Ban, Sparkles } from "lucide-react";
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

type Step = 1 | 2 | 3;

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
  
  const [venues, setVenues] = useState<(Venue & { is_available?: boolean })[]>([]);
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

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ venue_id: string; reason: string }[]>([]);

  const handleAISuggest = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      
      if (data.success) {
        // Auto-fill form
        const aiData = data.data;
        setFormData(f => ({
          ...f,
          expected_attendees: aiData.attendees?.toString() || "",
          equipment_requests: aiData.equipment || [],
          segments: [{ id: crypto.randomUUID(), date: aiData.date || "", start_time: "09:00", end_time: "17:00" }]
        }));
        setAiSuggestions(aiData.suggestions || []);
        toast.success("AI analyzed your request!");
      } else {
        toast.error(data.error || "AI failed to process request");
      }
    } catch {
      toast.error("Network error. Could not reach AI.");
    } finally {
      setAiLoading(false);
    }
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

  const validateStep1 = () => {
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchAvailableVenues = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/venues/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: formData.segments }),
      });
      const data = await res.json();
      if (data.success) {
        setVenues(data.data);
        if (selectedVenue) {
          const v = data.data.find((v: any) => v.id === selectedVenue.id);
          if (!v || !v.is_available) {
            setSelectedVenue(null);
            setFormData((f) => ({ ...f, venue_id: "" }));
          }
        }
      } else {
        toast.error("Failed to load venues");
      }
    } catch {
      toast.error("Network error while checking venues");
    } finally {
      setLoading(false);
    }
  };

  const handleStep1Submit = async () => {
    if (validateStep1()) {
      await fetchAvailableVenues();
      setStep(2);
    }
  };

  const filteredVenues = venues.filter((v) => {
    if (!query) return true;
    return (
      v.name.toLowerCase().includes(query.toLowerCase()) ||
      v.building.toLowerCase().includes(query.toLowerCase())
    );
  });

  const handleVenueSelect = (venue: Venue & { is_available?: boolean }) => {
    if (venue.is_available === false) return;
    
    if (parseInt(formData.expected_attendees) > venue.capacity) {
       toast.error(`Venue capacity is ${venue.capacity}. You have ${formData.expected_attendees} attendees.`);
       return;
    }

    setSelectedVenue(venue);
    setFormData((f) => ({ ...f, venue_id: venue.id }));
    setStep(3);
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
    if (!validateStep3()) return;

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

  return (
    <div className={styles.page}>
      <div className={styles.progress}>
        {[1, 2, 3].map((s) => (
          <div key={s} className={`${styles.progressStep} ${step >= s ? styles.active : ""} ${step === s ? styles.current : ""}`}>
            <div className={styles.progressDot}>{step > s ? "✓" : s}</div>
            <span>{["Schedule", "Select Venue", "Details"][s - 1]}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className={styles.step}>
          <div className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>Event Schedule</h2>
            <p className={styles.stepSubtitle}>Configure time slots and requirements</p>
          </div>

          <div className={styles.aiBox}>
            <div className={styles.aiHeader}>
              <Sparkles size={16} /> AI Venue Assistant
            </div>
            <div className={styles.aiInputGroup}>
              <Textarea 
                placeholder="E.g., I want a room for 60 people on 5th August with a mic and speaker..." 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={2}
              />
              <Button onClick={handleAISuggest} loading={aiLoading} type="button">
                Ask AI
              </Button>
            </div>
          </div>

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
                min={1}
              />
            </CardContent>
          </Card>

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
            <Button onClick={handleStep1Submit} loading={loading}>
              Find Available Venues <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.step}>
          <div className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>Select a Venue</h2>
            <p className={styles.stepSubtitle}>Showing venues based on your schedule</p>
          </div>

          <div className={styles.searchBar}>
            <Input
              placeholder="Search by name, building..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              icon={<Search size={16} />}
            />
          </div>

          {loading ? (
             <PageSpinner />
          ) : filteredVenues.length === 0 ? (
            <EmptyState
              icon={<MapPin size={40} />}
              title="No venues found"
              description="Try adjusting your search query"
            />
          ) : (
            <div className={styles.venueGrid}>
              {filteredVenues.map((venue) => {
                const isOccupied = venue.is_available === false;
                const tooSmall = parseInt(formData.expected_attendees) > venue.capacity;
                const disabled = isOccupied || tooSmall;
                const aiSuggestion = aiSuggestions.find(s => s.venue_id === venue.id);

                return (
                  <Card 
                    key={venue.id} 
                    hover={!disabled}
                    className={`${styles.venueOption} ${selectedVenue?.id === venue.id ? styles.selected : ""} ${disabled ? styles.disabledVenue : ""} ${aiSuggestion ? styles.aiSuggestedCard : ""}`}
                    onClick={() => handleVenueSelect(venue)}
                  >
                    <CardContent>
                      <div className={styles.venueOptionHeader}>
                        <h3 className={styles.venueOptionName}>
                          {venue.name} 
                          {aiSuggestion && <span className={styles.aiBadge}><Sparkles size={10}/> Suggested</span>}
                        </h3>
                        {isOccupied ? (
                          <Badge variant="error" className={styles.occupiedBadge}><Ban size={12}/> Occupied</Badge>
                        ) : (
                          <Badge>{venue.venue_type.replace("_", " ")}</Badge>
                        )}
                      </div>
                      <p className={styles.venueOptionBuilding}>
                        <MapPin size={12} /> {venue.building} · Floor {venue.floor}
                      </p>
                      <div className={styles.venueOptionMeta}>
                        <span className={formData.expected_attendees && venue.capacity < parseInt(formData.expected_attendees) ? styles.capacityWarning : ""}>
                          <Users size={12} /> Up to {venue.capacity} people
                        </span>
                      </div>
                      {aiSuggestion && (
                        <div className={styles.aiReasonText}>
                          &quot;{aiSuggestion.reason}&quot;
                        </div>
                      )}
                      {venue.amenities && venue.amenities.length > 0 && (
                        <div className={styles.amenities}>
                          {venue.amenities.slice(0, 4).map((a) => (
                            <span key={a} className={styles.amenityTag}>{a}</span>
                          ))}
                        </div>
                      )}
                      
                      {!isOccupied && !tooSmall && (
                        <button className={styles.selectBtn}>
                          Select Venue <ChevronRight size={14} />
                        </button>
                      )}
                      {tooSmall && !isOccupied && (
                        <button className={styles.selectBtnDisabled} disabled>
                          Too Small
                        </button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className={styles.stepActions}>
             <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className={styles.step}>
          <div className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>Event Details</h2>
            <p className={styles.stepSubtitle}>Provide event info and confirm booking</p>
          </div>

          <div className={styles.reviewGrid}>
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
