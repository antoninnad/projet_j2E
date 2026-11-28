package fr.cytech.projetj2e.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserProfile;
import fr.cytech.projetj2e.service.ProfileService;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpSession;

@RestController
@RequestMapping("/api")
public class ProfileRestController {

    public record ProfileResponse(Long id, String bio, String profilePictureUrl) {}
    public record ProfileRequest(String bio, String profilePictureUrl) {}
    public record PasswordRequest(String currentPassword, String newPassword, String confirmPassword) {}
    public record ColleagueResponse(Long id, String username, String firstName, String lastName) {}

    private final ProfileService profiles;
    private final SessionIdentityService identity;

    public ProfileRestController(ProfileService profiles, SessionIdentityService identity) {
        this.profiles = profiles;
        this.identity = identity;
    }

    @GetMapping("/profiles/me")
    public ProfileResponse myProfile(HttpSession session) {
        return profile(profiles.myProfile(identity.requireActiveMember(session)));
    }

    @PatchMapping("/profiles/me")
    public ProfileResponse updateMyProfile(@RequestBody ProfileRequest request,
                                           HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return profile(profiles.updateMine(actor, request.bio(), request.profilePictureUrl()));
    }

    @PostMapping("/profiles/me/password")
    public void changePassword(@RequestBody PasswordRequest request, HttpSession session) {
        User actor = identity.requireActiveMember(session);
        profiles.changePassword(actor, request.currentPassword(),
                request.newPassword(), request.confirmPassword());
    }

    @GetMapping("/users/{userId}/profile")
    public ProfileResponse colleagueProfile(@PathVariable Long userId, HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return profile(profiles.profile(actor, userId));
    }

    @GetMapping("/colleagues")
    public List<ColleagueResponse> colleagues(@RequestParam(required = false) String search,
                                              HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return profiles.listColleagues(actor, search).stream()
                .map(user -> new ColleagueResponse(user.getId(), user.getUsername(),
                        user.getFirstName(), user.getLastName()))
                .toList();
    }

    private static ProfileResponse profile(UserProfile profile) {
        return new ProfileResponse(profile.getId(), profile.getBio(),
                profile.getProfilePictureUrl());
    }
}
