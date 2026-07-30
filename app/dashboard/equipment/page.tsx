"use client";

import { useState, useEffect } from "react";
import { Monitor, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSpinner } from "@/components/ui/Spinner";
import type { Equipment } from "@/lib/types";
import styles from "./page.module.css";

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEquipment = async () => {
      setLoading(true);
      const res = await fetch("/api/equipment");
      const data = await res.json();
      if (data.success) {
        setEquipment(data.data);
      }
      setLoading(false);
    };
    fetchEquipment();
  }, []);

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
                      <Badge variant={isDepleted ? "error" : "success"}>
                        {eq.available_quantity} / {eq.total_quantity} available
                      </Badge>
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
