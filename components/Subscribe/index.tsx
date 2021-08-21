import React, { FormEvent, ChangeEvent, useState } from "react";
import {
  Stack,
  FormControl,
  Input,
  Button,
  useColorModeValue,
  Heading,
  Text,
  Box,
  Container,
} from "@chakra-ui/react";
import { CheckIcon } from "@chakra-ui/icons";

interface IProps {
  onPostSubmit: (email: string) => void;
}

type SubscribeFormState = "initial" | "submitting" | "success";

const Subscribe: React.FC<IProps> = ({ onPostSubmit }) => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubscribeFormState>("initial");
  const [error, setError] = useState(false);

  // Form submit handler
  const submitForm = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/subscribe", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    // Success if status code is 201
    if (res.status === 201) {
      setState("success");
      onPostSubmit(email);
    } else {
      setError(true);
      setState("initial");
    }
  };

  return (
    <Container>
      <Box p={100}>
        <Heading
          as={"h2"}
          fontSize={{ base: "xl", sm: "2xl" }}
          textAlign={"center"}
          mb={5}
        >
          Join the Okie.one waitlist
        </Heading>
        <Stack
          direction={{ base: "column", md: "row" }}
          as={"form"}
          spacing={"12px"}
          onSubmit={async (e: FormEvent) => {
            e.preventDefault();
            setError(false);
            setState("submitting");
            await submitForm(e);
          }}
        >
          <FormControl>
            <Input
              variant={"solid"}
              borderWidth={1}
              color={"gray.800"}
              _placeholder={{
                color: "gray.400",
              }}
              borderColor={useColorModeValue("gray.300", "gray.700")}
              id={"email"}
              type={"email"}
              required
              placeholder={"Your Email"}
              aria-label={"Your Email"}
              value={email}
              disabled={state !== "initial"}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setEmail(e.target.value)
              }
            />
          </FormControl>
          <FormControl w={{ base: "100%", md: "40%" }}>
            <Button
              colorScheme={state === "success" ? "green" : "blue"}
              isLoading={state === "submitting"}
              w="100%"
              type={state === "success" ? "button" : "submit"}
            >
              {state === "success" ? <CheckIcon /> : "Submit"}
            </Button>
          </FormControl>
        </Stack>
        <Text
          mt={2}
          textAlign={"center"}
          color={error ? "red.500" : "gray.500"}
        >
          {error
            ? "Oh no an error occured! 😢 Please try again later."
            : "Sign up today for your chance to try it out and help us improve ✌️"}
        </Text>
      </Box>
    </Container>
  );
};

export default Subscribe;
