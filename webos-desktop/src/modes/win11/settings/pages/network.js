import { select, subHeading, textField, toggle } from "../win11Controls.js";
import {
  WIN11_CDN_OPTIONS,
  WIN11_TRANSPORT_OPTIONS,
  WIN11_WISP_OPTIONS,
  WIN11_WINDOW_SWITCHER_MODE_OPTIONS,
  WIN11_WINDOW_SWITCHER_UI_OPTIONS,
} from "../win11SettingsBindings.js";
import { win11Icon, win11Description } from "../win11SettingsIcons.js";

function renderNetworkHero() {
  return `
    <div class="netTop">
      <div>
        <img src="/img/settings/wifi.png" alt="" height="100" />
        <div>
          <h2 class="font-medium text-lg">WiFi</h2>
          <p>Connected, secured</p>
        </div>
      </div>
      <div class="box">
        <span class="settingsIcon">\uE701</span>
        <div><h3>Properties</h3><p>Public network 5 Ghz</p></div>
      </div>
      <div class="box">
        <span class="settingsIcon">\uE701</span>
        <div><h3>Data Usage</h3><p>YukiOS runs locally in your browser</p></div>
      </div>
    </div>`;
}

export const networkPage = {
  id: "Network & internet",
  label: "Network & internet",
  hero: renderNetworkHero,
  tiles: () => [
    {
      name: "WiFi",
      desc: win11Description(
        "Network & internet",
        "WiFi",
        "Proxy server and asset mirror preferences",
      ),
      icon: win11Icon("Network & internet", "WiFi"),
      subPage: "network-wifi",
    },
    {
      name: "Proxy",
      desc: win11Description(
        "Network & internet",
        "Proxy",
        "Mirror used for fetching remote assets",
      ),
      icon: win11Icon("Network & internet", "Proxy"),
      subPage: "network-proxy",
    },
    {
      name: "Advanced network settings",
      desc: win11Description(
        "Network & internet",
        "Advanced network settings",
        "Transport protocol and window switching options",
      ),
      icon: win11Icon("Network & internet", "Advanced network settings"),
      subPage: "network-advanced",
    },
  ],
  subPages: {
    "network-wifi": {
      title: "WiFi",
      body: () =>
        [
          subHeading("WISP Server"),
          select(
            "wispServer",
            "WISP Server",
            "Choose a WISP proxy server for Scramjet",
            WIN11_WISP_OPTIONS,
          ),
          textField(
            "customWispUrl",
            "Custom WISP URL",
            "Enter your own WISP server URL",
            "wss://your-wisp-server.com/",
          ),
          subHeading("Content Delivery Network"),
          select(
            "cdnMirror",
            "CDN Mirror",
            "Choose a mirror for fetching game assets",
            WIN11_CDN_OPTIONS,
          ),
        ].join(""),
    },
    "network-proxy": {
      title: "Proxy",
      body: () =>
        select(
          "cdnMirror",
          "CDN Mirror",
          "Choose a mirror for fetching game assets",
          WIN11_CDN_OPTIONS,
        ),
    },
    "network-advanced": {
      title: "Advanced network settings",
      body: () =>
        [
          select(
            "browserTransport",
            "Transport Protocol",
            "Choose the proxy transport for the Scramjet browser",
            WIN11_TRANSPORT_OPTIONS,
          ),
          select(
            "windowSwitcherMode",
            "Switching Logic",
            "Order mode for cycling through windows",
            WIN11_WINDOW_SWITCHER_MODE_OPTIONS,
          ),
          select(
            "windowSwitcherUI",
            "UI Display Mode",
            "Visual representation while cycling",
            WIN11_WINDOW_SWITCHER_UI_OPTIONS,
          ),
          toggle(
            "windowSwitcherIncludeMinimized",
            "Include Minimized Windows",
            "Show minimized windows in the switcher",
          ),
        ].join(""),
    },
  },
};
