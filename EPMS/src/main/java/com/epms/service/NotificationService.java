package com.epms.service;

// added KHN ( ChatGPT)
public interface NotificationService {
    void send(Integer userId, String title, String message, String type);
}