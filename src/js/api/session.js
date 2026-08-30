let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function saveAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}
