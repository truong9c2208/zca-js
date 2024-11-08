import { ZaloApiError } from "../Errors/ZaloApiError.js";
import { GroupMessage, Message, MessageType } from "../models/Message.js";
import { apiFactory, encodeAES, makeURL, request } from "../utils.js";

export type UndoResponse = {
    status: number;
};

export const undoFactory = apiFactory<UndoResponse>()((api, ctx, resolve) => {
    const URLType = {
        [MessageType.DirectMessage]: makeURL(`${api.zpwServiceMap.chat[0]}/api/message/undo`),
        [MessageType.GroupMessage]: makeURL(`${api.zpwServiceMap.group[0]}/api/group/undomsg`),
    };
    /**
     * Undo a message
     *
     * @param message Message or GroupMessage instance that has quote to undo
     *
     * @throws ZaloApiError
     */
    return async function undo(message: Message | GroupMessage) {
        if (!(message instanceof Message) && !(message instanceof GroupMessage))
            throw new ZaloApiError(
                "Expected Message or GroupMessage instance, got: " + (message as unknown as any)?.constructor?.name,
            );
        if (!message.data.quote) throw new ZaloApiError("Message does not have quote");

        const params: any = {
            msgId: message.data.quote.globalMsgId,
            clientId: Date.now(),
            cliMsgIdUndo: message.data.quote.cliMsgId,
        };

        if (message instanceof GroupMessage) {
            params["grid"] = message.threadId;
            params["visibility"] = 0;
            params["imei"] = ctx.imei;
        } else params["toid"] = message.threadId;

        const encryptedParams = encodeAES(ctx.secretKey, JSON.stringify(params));
        if (!encryptedParams) throw new ZaloApiError("Failed to encrypt message");

        const response = await request(URLType[message.type], {
            method: "POST",
            body: new URLSearchParams({
                params: encryptedParams,
            }),
        });

        return resolve(response);
    };
});
