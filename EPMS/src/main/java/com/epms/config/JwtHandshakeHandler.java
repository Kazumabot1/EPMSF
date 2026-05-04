package com.epms.config;

import com.epms.security.CustomUserDetailsService;
import com.epms.security.JwtService;
import com.epms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import java.security.Principal;
import java.util.Map;

/**
 * Associates the SockJS/WebSocket session with the authenticated user via JWT in the query string
 * ({@code ?token=...}), so user-targeted STOMP messages resolve correctly.
 */
@Component
@RequiredArgsConstructor
public class JwtHandshakeHandler extends DefaultHandshakeHandler {

    private final JwtService jwtService;
    private final CustomUserDetailsService customUserDetailsService;

    @Override
    protected Principal determineUser(
            ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes
    ) {
        if (!(request instanceof ServletServerHttpRequest servletRequest)) {
            return null;
        }

        String token = servletRequest.getServletRequest().getParameter("token");
        if (token == null || token.isBlank()) {
            return null;
        }

        try {
            String email = jwtService.extractUsername(token);
            UserPrincipal principal = (UserPrincipal) customUserDetailsService.loadUserByUsername(email);
            if (!jwtService.isTokenValid(token, principal)) {
                return null;
            }
            return () -> principal.getUsername();
        } catch (Exception ignored) {
            return null;
        }
    }
}
