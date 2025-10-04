import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

type ReadyPlayerMeCreatorModalProps = {
  visible: boolean;
  onClose: () => void;
  onAvatarExported: (url: string) => void;
  partnerSubdomain?: string;
};

const READY_PLAYER_ME_DEMO_URL =
  "https://demo.readyplayer.me/avatar?frameApi&quality=medium&bodyType=fullbody";

export default function ReadyPlayerMeCreatorModal({
  visible,
  onClose,
  onAvatarExported,
  partnerSubdomain,
}: ReadyPlayerMeCreatorModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
    }
  }, [visible]);

  const creatorUrl = useMemo(() => {
    if (!partnerSubdomain) {
      return READY_PLAYER_ME_DEMO_URL;
    }
    const normalized = partnerSubdomain.trim().replace(/^https?:\/\//i, "");
    const cleanSubdomain = normalized.replace(/\.readyplayer\.me$/i, "");
    return `https://${cleanSubdomain}.readyplayer.me/avatar?frameApi&quality=medium&bodyType=fullbody`;
  }, [partnerSubdomain]);

  const htmlContent = useMemo(
    () => `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: #0f172a; }
      #rpm-frame { border: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <iframe
      id="rpm-frame"
      src="${creatorUrl}"
      allow="camera *; microphone *; clipboard-write"
    ></iframe>
    <script>
      const frame = document.getElementById('rpm-frame');
      function subscribe(eventName) {
        const payload = {
          target: 'readyplayerme',
          type: 'subscribe',
          eventName,
        };
        frame.contentWindow.postMessage(JSON.stringify(payload), '*');
      }

      window.addEventListener('message', function(event) {
        if (!event.data) {
          return;
        }
        let data;
        try {
          data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        } catch (error) {
          return;
        }
        if (!data || data.source !== 'readyplayerme') {
          return;
        }
        if (data.eventName === 'v1.frame.ready') {
          subscribe('v1.avatar.exported');
          subscribe('v1.user.set');
        }
        if (data.eventName === 'v1.avatar.exported') {
          const avatarUrl = data?.data?.glb?.url || data?.data?.avatarUrl || '';
          if (avatarUrl) {
            window.ReactNativeWebView?.postMessage(JSON.stringify({
              type: 'avatar-exported',
              avatarUrl,
            }));
          }
        }
      });
    </script>
  </body>
</html>`,
    [creatorUrl],
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const { data } = event.nativeEvent;
      if (!data) {
        return;
      }
      try {
        const parsed = JSON.parse(data);
        if (parsed?.type === "avatar-exported" && typeof parsed.avatarUrl === "string") {
          onAvatarExported(parsed.avatarUrl);
        }
      } catch (error) {
        // Ignore malformed messages.
      }
    },
    [onAvatarExported],
  );

  return (
    <Modal visible={visible} onRequestClose={onClose} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.85}>
            <Feather name="x" size={20} color="#f8fafc" />
            <Text style={styles.closeLabel}>Fermer</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Studio Ready Player Me</Text>
          <View style={styles.closePlaceholder} />
        </View>
        <View style={styles.webviewContainer}>
          <WebView
            originWhitelist={["*"]}
            source={{ html: htmlContent }}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            onMessage={handleMessage}
            mixedContentMode="alwaysAllow"
          />
          {isLoading ? (
            <View style={styles.webviewLoader} pointerEvents="none">
              <ActivityIndicator size="large" color="#38bdf8" />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#020617",
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
    backgroundColor: "#0f172a",
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#1f2937",
  },
  closeLabel: {
    color: "#f8fafc",
    fontWeight: "600",
  },
  closePlaceholder: {
    width: 60,
  },
  webviewContainer: {
    flex: 1,
  },
  webviewLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617cc",
  },
});
