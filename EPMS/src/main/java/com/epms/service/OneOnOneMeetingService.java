//package com.epms.service;
//
//import com.epms.dto.FollowUpRequestDto;
//import com.epms.dto.OneOnOneMeetingRequestDto;
//import com.epms.dto.OneOnOneMeetingResponseDto;
//
//import java.util.List;
//
//public interface OneOnOneMeetingService {
//
//    OneOnOneMeetingResponseDto createMeeting(OneOnOneMeetingRequestDto request);
//
//    List<OneOnOneMeetingResponseDto> getUpcomingMeetings();
//
//    List<OneOnOneMeetingResponseDto> getOngoingMeetings();
//
//    List<OneOnOneMeetingResponseDto> getPastMeetings();
//
//    OneOnOneMeetingResponseDto getMeetingById(Integer id);
//
//    /** Auto-stamped by server when manager clicks Finish */
//    OneOnOneMeetingResponseDto finishMeeting(Integer id);
//
//    /** Set a follow-up datetime. Meeting is NOT finalized yet. */
//    OneOnOneMeetingResponseDto setFollowUp(Integer id, FollowUpRequestDto request);
//
//    /** Called by @Scheduled — flips status to true for meetings whose scheduledDate has passed */
//    void autoActivateDueMeetings();
//}

// khn (chatgpt)
//package com.epms.service;
//
//import com.epms.dto.FollowUpRequestDto;
//import com.epms.dto.OneOnOneMeetingRequestDto;
//import com.epms.dto.OneOnOneMeetingResponseDto;
//
//import java.util.List;
//
//public interface OneOnOneMeetingService {
//
//    OneOnOneMeetingResponseDto createMeeting(OneOnOneMeetingRequestDto request);
//
//    OneOnOneMeetingResponseDto updateMeeting(Integer id, OneOnOneMeetingRequestDto request);
//
//    void deleteMeeting(Integer id);
//
//    List<OneOnOneMeetingResponseDto> getUpcomingMeetings();
//
//    List<OneOnOneMeetingResponseDto> getOngoingMeetings();
//
//    List<OneOnOneMeetingResponseDto> getPastMeetings();
//
//    OneOnOneMeetingResponseDto getMeetingById(Integer id);
//
//    OneOnOneMeetingResponseDto finishMeeting(Integer id);
//
//    OneOnOneMeetingResponseDto setFollowUp(Integer id, FollowUpRequestDto request);
//
//    void autoActivateDueMeetings();
//}
package com.epms.service;

import com.epms.dto.FollowUpRequestDto;
import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.OneOnOneMeetingResponseDto;

import java.util.List;

public interface OneOnOneMeetingService {

    OneOnOneMeetingResponseDto createMeeting(OneOnOneMeetingRequestDto request);

    OneOnOneMeetingResponseDto updateMeeting(Integer id, OneOnOneMeetingRequestDto request);

    void deleteMeeting(Integer id);

    List<OneOnOneMeetingResponseDto> getUpcomingMeetings();

    List<OneOnOneMeetingResponseDto> getOngoingMeetings();

    List<OneOnOneMeetingResponseDto> getPastMeetings();

    OneOnOneMeetingResponseDto getMeetingById(Integer id);

    OneOnOneMeetingResponseDto finishMeeting(Integer id);

    OneOnOneMeetingResponseDto setFollowUp(Integer id, FollowUpRequestDto request);

    void autoActivateDueMeetings();
}