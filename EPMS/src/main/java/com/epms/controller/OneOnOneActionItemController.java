package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.OneOnOneActionItemRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;
import com.epms.service.OneOnOneActionItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/one-on-one-action-items")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class OneOnOneActionItemController {

    private final OneOnOneActionItemService actionItemService;

    /** Create or update the description for a meeting's action item */
    @PostMapping
    public ResponseEntity<GenericApiResponse<OneOnOneActionItemResponseDto>> saveActionItem(
            @RequestBody OneOnOneActionItemRequestDto request) {
        OneOnOneActionItemResponseDto saved = actionItemService.saveActionItem(request);
        return ResponseEntity.ok(GenericApiResponse.success("Action item saved", saved));
    }

    /** Get the action item for a specific meeting */
    @GetMapping("/meeting/{meetingId}")
    public ResponseEntity<GenericApiResponse<OneOnOneActionItemResponseDto>> getByMeeting(
            @PathVariable Integer meetingId) {
        Optional<OneOnOneActionItemResponseDto> item = actionItemService.getByMeetingId(meetingId);
        return item
                .map(dto -> ResponseEntity.ok(GenericApiResponse.success("Action item fetched", dto)))
                .orElse(ResponseEntity.ok(GenericApiResponse.success("No action item yet", null)));
    }
}
