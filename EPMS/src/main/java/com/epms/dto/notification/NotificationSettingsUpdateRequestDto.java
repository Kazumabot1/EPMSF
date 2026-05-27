package com.epms.dto.notification;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingsUpdateRequestDto {

    @Valid
    @NotEmpty(message = "At least one notification setting is required.")
    private List<Item> settings = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        private String category;
        private Boolean enabled;
    }
}
