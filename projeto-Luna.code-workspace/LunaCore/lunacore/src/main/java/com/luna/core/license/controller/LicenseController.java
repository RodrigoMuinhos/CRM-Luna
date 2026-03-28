package com.luna.core.license.controller;

import com.luna.core.license.dto.ActivateLicenseRequest;
import com.luna.core.license.dto.ActivationResponse;
import com.luna.core.license.dto.LicenseStatusResponse;
import com.luna.core.license.service.LicenseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/license")
@RequiredArgsConstructor
@Slf4j
public class LicenseController {

    private final LicenseService licenseService;

    @GetMapping("/status")
    public LicenseStatusResponse getStatus(@RequestParam String productKey,
                                           @RequestParam String deviceId) {
        return licenseService.getStatus(productKey, deviceId);
    }

    @PostMapping("/activate")
    public ActivationResponse activate(@RequestBody @Valid ActivateLicenseRequest request) {
        return licenseService.activate(request);
    }
}
