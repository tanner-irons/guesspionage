import { ResponseActions } from "../actions/ResponseActions";

const initialState = {
    responses: [],
    activeIndex: 0
};

export default (state = initialState, action) => {
    switch (action.type) {
        case ResponseActions.SetResponses:
            state.responses = action.payload;
            return state;
        case ResponseActions.UpdateActiveIndex:
            state.activeIndex = action.payload;
            return state;
        case ResponseActions.IncrementActiveIndex:
            if (state.activeIndex < state.responses.length) {
                state.activeIndex++;
            }
            return state;
        case ResponseActions.DecrementActiveIndex:
            if (state.activeIndex >= 0) {
                state.activeIndex--;
            }
            return state;
        default:
            return state;
    }
};