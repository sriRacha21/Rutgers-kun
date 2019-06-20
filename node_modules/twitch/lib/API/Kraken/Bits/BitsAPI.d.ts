import { UserIdResolvable } from '../../../Toolkit/UserTools';
import CheermoteList from './CheermoteList';
import BaseAPI from '../../BaseAPI';
/**
 * The API methods that deal with Bits/Cheermotes.
 *
 * Can be accessed using `client.kraken.bits` on a {@TwitchClient} instance.
 *
 * ## Example
 * ```ts
 * const client = await TwitchClient.withCredentials(clientId, accessToken);
 * const cheermotes = await client.kraken.bits.getCheermotes();
 * ```
 */
export default class BitsAPI extends BaseAPI {
    /**
     * Retrieves global and channel cheermotes.
     *
     * @param channel The channel you want to retrieve the available cheermotes for.
     * If not given, this method retrieves a list of globally available cheermotes.
     * @param includeSponsored Whether to include sponsored cheermotes in the list.
     */
    getCheermotes(channel?: UserIdResolvable, includeSponsored?: boolean): Promise<CheermoteList>;
}
