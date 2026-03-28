package com.luna.core.device.entity;

import com.luna.core.common.enums.DeviceStatus;
import com.luna.core.license.entity.License;
import com.luna.core.tenant.entity.Tenant;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "devices")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "license_id", nullable = false)
    private License license;

    @Column(nullable = false, unique = true)
    private String deviceId;

    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeviceStatus status;

    @Column(nullable = false, updatable = false)
    private Instant firstSeenAt;

    @Column(nullable = false)
    private Instant lastSeenAt;

    @PrePersist
    void prePersist() {
        firstSeenAt = Instant.now();
        lastSeenAt = firstSeenAt;
        if (status == null) {
            status = DeviceStatus.ACTIVE;
        }
    }

    @PreUpdate
    void preUpdate() {
        lastSeenAt = Instant.now();
    }
}
