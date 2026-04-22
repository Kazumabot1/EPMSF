// KHN modified files
// (Wrap users in GenericApiResponse for consistent data transport)

package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.entity.User;
import com.epms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/department/{deptId}")
    public ResponseEntity<GenericApiResponse<List<User>>> getUsersByDepartment(@PathVariable Integer deptId) {
        return ResponseEntity.ok(GenericApiResponse.success("Users fetched", userRepository.findByDepartmentIdAndActiveTrue(deptId)));
    }
}
