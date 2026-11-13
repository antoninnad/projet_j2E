package fr.cytech.projetj2e.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

@ControllerAdvice
public class FrontendConfiguration {

    private final String viteDevServerUrl;

    public FrontendConfiguration(@Value("${frontend.vite-dev-server-url:}") String viteDevServerUrl) {
        this.viteDevServerUrl = viteDevServerUrl;
    }

    @ModelAttribute
    public void frontendAssets(Model model) {
        model.addAttribute("viteDevServerUrl", viteDevServerUrl);
        model.addAttribute("viteClientUrl", viteDevServerUrl + "/@vite/client");
        model.addAttribute("viteReactRefreshUrl", viteDevServerUrl + "/@react-refresh");
        model.addAttribute("viteEntryUrl", viteDevServerUrl + "/src/main.tsx");
    }
}
