const ACCESS_TOKEN_KEY = 'radar-passagens.access-token';

let accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);

export function getAccessToken() {
  return accessToken;
}

export function saveAccessToken(token) {
  accessToken = token;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  accessToken = null;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}
