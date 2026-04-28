package com.epms.service;

import com.epms.dto.OneOnOneActionItemRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;

import java.util.Optional;

public interface OneOnOneActionItemService {

    /** Create or update the single action item for a meeting */
    OneOnOneActionItemResponseDto saveActionItem(OneOnOneActionItemRequestDto request);

    /** Get the action item for a meeting (may be empty if not yet entered) */
    Optional<OneOnOneActionItemResponseDto> getByMeetingId(Integer meetingId);
}
