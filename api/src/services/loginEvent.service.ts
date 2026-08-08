import { loginEventRepository } from "../repositories/loginEvent.repository";

async function list() {
  return loginEventRepository.findAllSorted(200);
}

export const loginEventService = {
  list,
};
