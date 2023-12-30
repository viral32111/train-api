import { Client } from "@stomp/stompjs"
import log4js from "log4js"
import { WebSocket } from "ws"

import {
	NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_HOST,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_LIVE_FEED,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_PASSWORD,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_PORT_STOMP,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_STATUS_MESSAGES,
	NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_USER
} from "../../../environment.js"

const log = log4js.getLogger("darwin-push-port/topic")

Object.assign(global, { WebSocket })

export const testSTOMP = (): void => {
	log.debug("Connecting to Darwin Push Port via STOMP...")

	const stompClient = new Client({
		brokerURL: `ws://${NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_HOST}:${NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_PORT_STOMP}`,
		connectHeaders: {
			"client-id": `${NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_USER}-train-api`,
			"username": NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_USER,
			"login": NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_USER,
			"passcode": NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_PASSWORD
		},
		onConnect: (frame): void => {
			log.debug("Connected to Darwin Push Port via STOMP (%d bytes).", frame.binaryBody.length)

			log.debug("Subscribing to live feed...")
			stompClient.subscribe(
				`/topic/${NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_LIVE_FEED}`,
				message => {
					log.debug("Received live feed STOMP message (%d bytes).", message.binaryBody.length)
				},
				{
					"activemq.subscriptionName": `${NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_USER}-train-api`
				}
			)

			log.debug("Subscribing to status messages...")
			stompClient.subscribe(
				`/topic/${NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_STATUS_MESSAGES}`,
				message => {
					log.debug("Received status message STOMP message (%d bytes).", message.binaryBody.length)
				},
				{
					"activemq.subscriptionName": `${NATIONAL_RAIL_DARWIN_PUSH_PORT_TOPIC_USER}-train-api`
				}
			)
		},
		onStompError: (frame): void => {
			log.error("STOMP error: %s (%s)", frame.headers["message"], frame.body)
		},
		reconnectDelay: 5000,
		heartbeatIncoming: 15000,
		heartbeatOutgoing: 15000
	})

	log.debug("Activating STOMP client...")
	stompClient.activate()
	log.debug("Activated STOMP client.")
}
