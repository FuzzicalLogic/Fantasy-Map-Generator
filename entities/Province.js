import { rw } from "../modules/utils.js";

export const forms = {
    Monarchy: {
        County: 11,
        Earldom: 3, Shire: 1, Landgrave: 1, Margrave: 1, Barony: 1
    },
    Republic: {
        Province: 6, Department: 2, Governorate: 2,
        State: 1, Canton: 1, Prefecture: 1
    },
    Theocracy: {
        Parish: 5, Deanery: 3, Province: 2,
        Council: 1, District: 1
    },
    Union: { Province: 2, State: 1, Canton: 1, Republic: 1, County: 1 },
    Wild: {
        Territory: 10, Land: 5, Province: 2,
        Region: 2, Tribe: 1, Clan: 1
    },
    Horde: { Horde: 1 }
}

export function getRandomForm(governmentType) {
    return rw(forms[governmentType]);
}