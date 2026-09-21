export const BASE_URL = "https://mapple.fun";
export const SUBTITLE_BASE = "https://sub.wyzie.io";
export const TMDB_BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";

export const DEFAULT_USER_AGENT = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36";

export const API_HEADERS = {
    "User-Agent": DEFAULT_USER_AGENT,
    "Accept": "*/*",
    "Origin": BASE_URL,
    "Referer": `${BASE_URL}/`
};

export const PLAYBACK_HEADERS = {
    "Referer": `${BASE_URL}/`,
    "Origin": BASE_URL,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

export const HOSTERS = [
    { name: "Zeus", key: "mapple" },
    { name: "Poseidon", key: "s25" },
    { name: "Athena", key: "s2" },
    { name: "Hera", key: "s4" },
    { name: "Persephone", key: "s12" },
    { name: "Apollo", key: "s19" },
    { name: "Artemis", key: "s13" },
    { name: "Hermes", key: "s26" },
    { name: "Ares", key: "s24" },
    { name: "Aphrodite", key: "s6" },
    { name: "Hephaestus", key: "s15" },
    { name: "Demeter", key: "s7" },
    { name: "Dionysus", key: "s8" },
    { name: "Hestia", key: "s3" },
    { name: "Hades", key: "s16" },
    { name: "Nike", key: "s5" },
    { name: "Atlas", key: "s1" },
    { name: "Prometheus", key: "s10" }
];
