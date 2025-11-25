import ssl
import threading
import time
from typing import Optional, Callable
import paho.mqtt.client as mqtt

IOT_ENDPOINT = "a2wv3um0gvpert-ats.iot.ap-south-1.amazonaws.com"
IOT_PORT = 8883
CLIENT_ID = "pi-1"

CA_PATH = "certs/rootCA1.pem"
CERT_PATH = "certs/certificate.pem.crt"
KEY_PATH = "certs/private.pem.key"

def _on_connect(client, userdata, flags, rc):
    print(f"[MQTT] Connected rc={rc}")

def _on_disconnect(client, userdata, rc):
    print(f"[MQTT] Disconnected rc={rc}")

class IoTClientSingleton:
    _lock = threading.Lock()
    _client: Optional[mqtt.Client] = None

    @classmethod
    def get_client(cls,
                   client_id: str = CLIENT_ID,
                   on_connect: Callable = _on_connect,
                   on_disconnect: Callable = _on_disconnect) -> mqtt.Client:
        with cls._lock:
            if cls._client is not None:
                return cls._client

            c = mqtt.Client(client_id=client_id, clean_session=True)
            c.on_connect = on_connect
            c.on_disconnect = on_disconnect

            c.tls_set(
                ca_certs=CA_PATH,
                certfile=CERT_PATH,
                keyfile=KEY_PATH,
                tls_version=ssl.PROTOCOL_TLSv1_2
            )
            c.tls_insecure_set(False)

            # Connect and IMMEDIATELY start loop so publishes flush
            c.connect(IOT_ENDPOINT, IOT_PORT, keepalive=60)
            c.loop_start()  # critical

            time.sleep(0.2)  # brief settle
            cls._client = c
            return cls._client

    @classmethod
    def stop(cls):
        with cls._lock:
            if cls._client is not None:
                try:
                    cls._client.loop_stop()
                    cls._client.disconnect()
                finally:
                    cls._client = None

def publish_json(topic: str, payload_dict: dict, qos: int = 0, retain: bool = False):
    import json
    c = IoTClientSingleton.get_client()
    return c.publish(topic, json.dumps(payload_dict), qos=qos, retain=retain)
