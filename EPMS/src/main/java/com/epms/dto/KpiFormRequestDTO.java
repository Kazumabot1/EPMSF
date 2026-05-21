package com.epms.dto;

import com.epms.entity.enums.KpiFormStatus;
import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiFormRequestDTO {

    private String title;

    private LocalDate startDate;

    private LocalDate endDate;

    private KpiFormStatus status;

    /*
     * Compatibility fix:
     *
     * Different frontend versions used different names:
     * - positionIds
     * - positionId
     * - positions
     *
     * The service uses getPositionIds(), so all names must land here.
     */
    @JsonAlias({"positionId", "positions"})
    @Builder.Default
    private List<Integer> positionIds = new ArrayList<>();

    @Builder.Default
    private List<KpiFormItemDTO> items = new ArrayList<>();

    public List<Integer> getPositionIds() {
        if (positionIds == null) {
            return new ArrayList<>();
        }

        return positionIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();
    }

    public void setPositionIds(List<Integer> positionIds) {
        this.positionIds = positionIds == null ? new ArrayList<>() : positionIds;
    }

    /*
     * Handles frontend payload like:
     * { "positionId": 3 }
     */
    public void setPositionId(Integer positionId) {
        if (positionId == null || positionId <= 0) {
            this.positionIds = new ArrayList<>();
            return;
        }

        this.positionIds = new ArrayList<>(List.of(positionId));
    }

    /*
     * Handles frontend payload like:
     * { "positions": [3] }
     */
    public void setPositions(List<Integer> positions) {
        setPositionIds(positions);
    }

    public List<KpiFormItemDTO> getItems() {
        return items == null ? new ArrayList<>() : items;
    }

    public void setItems(List<KpiFormItemDTO> items) {
        this.items = items == null ? new ArrayList<>() : items;
    }
}