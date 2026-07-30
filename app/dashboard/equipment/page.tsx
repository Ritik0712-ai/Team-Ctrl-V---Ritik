"use client";

import { useState, useEffect } from "react";
import { Monitor, CheckCircle, AlertTriangle, Edit2, Save, X } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import type { Equipment } from "@/lib/types";
import styles from "./page.module.css";

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  const fetchEquipment = async () => {
    const res = await fetch("/api/equipment");
    const data = await res.json();
    if (data.success) {
      setEquipment(data.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/equipment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total_quantity: editQty })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Inventory updated");
        setEditingId(null);
        fetchEquipment();
      } else {
        toast.error(data.error || "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };


  if (loading) return <PageSpinner />;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Equipment</h1>
          <p className={styles.pageSubtitle}>Track and manage equipment inventory</p>
        </div>
      </div>

      {equipment.length === 0 ? (
        <EmptyState
          icon={<Monitor size={40} />}
          title="No equipment found"
          description="Equipment inventory is empty"
        />
      ) : (
        <div className={styles.grid}>
          {equipment.map((eq) => {
            const usagePercent = ((eq.total_quantity - eq.available_quantity) / eq.total_quantity) * 100;
            const isDepleted = eq.available_quantity === 0;

            return (
              <Card key={eq.id} className={styles.eqCard}>
                <CardContent>
                  <div className={styles.eqHeader}>
                    <div className={styles.eqIcon}>
                      <Monitor size={20} />
                    </div>
                    <div className={styles.eqInfo}>
                      <h3 className={styles.eqName}>{eq.name}</h3>
                      {editingId === eq.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <input 
                            type="number" 
                            value={editQty} 
                            onChange={e => setEditQty(parseInt(e.target.value) || 0)} 
                            style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
                            min={0}
                          />
                          <button onClick={() => handleSave(eq.id)} disabled={saving} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer' }}><Save size={16} /></button>
                          <button onClick={() => setEditingId(null)} disabled={saving} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={16} /></button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <Badge variant={isDepleted ? "error" : "success"}>
                            {eq.available_quantity} / {eq.total_quantity} available
                          </Badge>
                          <button 
                            onClick={() => { setEditingId(eq.id); setEditQty(eq.total_quantity); }} 
                            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
                            title="Edit Total Quantity"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className={styles.eqMeta}>
                    <span>Type: {eq.equipment_type.replace("_", " ")}</span>
                    {eq.venue_id && <span>In-venue equipment</span>}
                  </div>

                  {/* Usage bar */}
                  <div className={styles.usageBar}>
                    <div
                      className={`${styles.usageFill} ${isDepleted ? styles.depleted : ""}`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>

                  {isDepleted && (
                    <div className={styles.depletedWarning}>
                      <AlertTriangle size={13} />
                      All units currently allocated
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
