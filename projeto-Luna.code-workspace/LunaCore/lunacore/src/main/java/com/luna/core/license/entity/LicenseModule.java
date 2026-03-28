package com.luna.core.license.entity;

import com.luna.core.common.enums.ModuleCode;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "license_modules")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LicenseModule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "license_id", nullable = false)
    private License license;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ModuleCode moduleCode;

    @Column(nullable = false)
    private boolean enabled;

    @PrePersist
    void prePersist() {
        if (!enabled) {
            enabled = true;
        }
    }
}
